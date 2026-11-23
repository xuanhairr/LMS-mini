import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Card,
    Row,
    Col,
    Button,
    Tag,
    Typography,
    Divider,
    List,
    Avatar,
    Progress,
    Breadcrumb,
    Empty,
    message,
    Spin,
    Space,
    Table,
    Tabs,
    Modal,
    Tooltip,
    Input,
    Form,
    Badge,
    Collapse
} from 'antd';
import {
    ArrowLeftOutlined,
    PlayCircleOutlined,
    FileTextOutlined,
    QuestionCircleOutlined,
    ClockCircleOutlined,
    UserOutlined,
    StarOutlined,
    CheckCircleFilled,
    LockOutlined,
    RightOutlined,
    HistoryOutlined,
    DoubleRightOutlined,
    PaperClipOutlined,
    DownloadOutlined,
    GithubOutlined,
    CheckCircleOutlined,
    SearchOutlined
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiFetch } from '@/lib/api';
import { Course } from '@/pages/teacher/ManageCourses';
import VideoPlayer from '@/components/learning/VideoPlayer';
import QuizPlayer from '@/components/learning/QuizPlayer';

// Interfaces based on backend
interface Lesson {
    id: string;
    title: string;
    typeField: string;
    duration: number;
    status: string;
    order?: number;
    content?: string;
    videos?: { url: string, title?: string, duration?: number }[];
    quizzes?: { id: string, title: string, questions: any[] }[];
}

interface Enrollment {
    id: string;
    classId: string;
    studentId: string;
    class?: {
        courseId: string;
        status?: string;
    };
}

interface ProgressRecord {
    id: string;
    lessonId: string;
    completed: boolean;
    completedItems?: string[];
    videoWatchedSeconds?: number;
    videoDuration?: number;
}

const { Title, Text, Paragraph } = Typography;

// Local Course interface extension
interface CourseDetailInfo extends Course {
    teacher?: {
        id: string;
        username: string; // Must be required to match Course interface
        fullName?: string;
        avatar?: string;
    };
    thumbnail?: string; // Some legacy code uses thumbnail
}

const CourseDetail: React.FC = () => {
    const { id, itemId } = useParams<{ id: string, itemId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [course, setCourse] = useState<CourseDetailInfo | null>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
    const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [descExpanded, setDescExpanded] = useState(false);
    const [lessonAttachments, setLessonAttachments] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<string>('1');

    const fetchData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            // Fetch Course with Lessons and their sub-resources
            const res = await apiFetch<any>(`/courses/${id}`);
            const courseData = res.data;
            setCourse(courseData);
            const fetchedLessons = courseData?.lessons || [];
            setLessons(fetchedLessons);

            // Fetch Enrollment and Progress if user is logged in
            if (user?.id) {
                const enrollmentsRes = await apiFetch<Enrollment[]>(
                    `/enrollments?where[studentId]=${user.id}&where[courseId]=${id}&include[class]=true`
                );
                const enrollmentData = enrollmentsRes.data || [];
                const currentEnrollment = enrollmentData.length > 0 ? enrollmentData[0] : null;
                setEnrollment(currentEnrollment);

                const progressRes = await apiFetch<any[]>(`/progresses/by-course?studentId=${user.id}&courseId=${id}`);
                const progressData = progressRes.data || [];
                const groupedProgress = new Map<string, any>();
                progressData.forEach(p => {
                    const lessonId = p.lesson?.id;
                    if (!lessonId) return;
                    if (!groupedProgress.has(lessonId)) {
                        groupedProgress.set(lessonId, {
                            id: p.id,
                            lessonId,
                            completed: p.completed,
                            completedItems: new Set(p.completedItems || []),
                            videoWatchedSeconds: p.videoWatchedSeconds ?? 0,
                            videoDuration: p.videoDuration ?? 0,
                        });
                    } else {
                        const existing = groupedProgress.get(lessonId);
                        existing.completed = existing.completed || p.completed;
                        (p.completedItems || []).forEach((i: string) => existing.completedItems.add(i));
                        existing.videoWatchedSeconds = Math.max(existing.videoWatchedSeconds, p.videoWatchedSeconds ?? 0);
                        existing.videoDuration = Math.max(existing.videoDuration, p.videoDuration ?? 0);
                    }
                });

                setProgressRecords(Array.from(groupedProgress.values()).map(g => ({
                    ...g,
                    completedItems: Array.from(g.completedItems)
                })));

                if (currentEnrollment?.classId) {
                    try {
                        const subsRes = await apiFetch<any>(`/upload/class/${currentEnrollment.classId}/my-submissions`);
                        setSubmissions(subsRes.data || []);
                    } catch (e) {
                        console.error('Error fetching submissions', e);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching course detail:', error);
            message.error('Không thể tải thông tin khóa học');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id, user?.id]);

    const handleMarkItemComplete = async (lessonId: string, itemId: string) => {
        if (!enrollment || !user || !course) return;

        try {
            const lesson = course.lessons?.find((l: any) => l.id === lessonId);
            if (!lesson) return;
            
            // Lấy tổng số item cần học từ lesson (bao gồm cả videos và quizzes)
            const expectedItemIds: string[] = [];
            if (lesson.videos && lesson.videos.length > 0) {
                lesson.videos.forEach((_: any, idx: number) => expectedItemIds.push(`${lesson.id}_v_${idx}`));
            }
            if (lesson.quizzes && lesson.quizzes.length > 0) {
                lesson.quizzes.forEach((_: any, idx: number) => expectedItemIds.push(`${lesson.id}_q_${idx}`));
            }
            if ((!lesson.videos || lesson.videos.length === 0) && (!lesson.quizzes || lesson.quizzes.length === 0)) {
                expectedItemIds.push(`${lesson.id}_d`);
            }
            
            const existingProgress = progressRecords.find(p => p.lessonId === lessonId);
            const currentCompletedItems = existingProgress?.completedItems || [];
            
            const newCompletedItems = currentCompletedItems.includes(itemId)
                ? currentCompletedItems
                : [...currentCompletedItems, itemId];

            const isLessonCompleted = expectedItemIds.length > 0 
                ? expectedItemIds.every(id => newCompletedItems.includes(id)) 
                : true;

            if (currentCompletedItems.includes(itemId) && existingProgress?.completed) {
                return; // Đã xem và bài học đã được đánh dấu hoàn thành
            }

            if (existingProgress) {
                await apiFetch(`/progresses/${existingProgress.id}/complete-item`, {
                    method: 'PATCH',
                    body: JSON.stringify({ 
                        itemId,
                        isLessonCompleted 
                    })
                });
                
                setProgressRecords(prev => prev.map(p => 
                    p.id === existingProgress.id 
                        ? { ...p, completedItems: newCompletedItems, completed: isLessonCompleted || p.completed } 
                        : p
                ));
            } else {
                // Tạo mới nếu chưa có
                const res = await apiFetch('/progresses', {
                    method: 'POST',
                    body: JSON.stringify({
                        lesson: { id: lessonId },
                        student: { id: user.id },
                        completedItems: [itemId],
                        completed: isLessonCompleted
                    })
                });
                if (res.data) {
                    setProgressRecords(prev => [...prev, {
                        id: res.data.id,
                        lessonId,
                        completed: isLessonCompleted,
                        completedItems: [itemId]
                    }]);
                }
            }
        } catch (error) {
            console.error('Error updating progress:', error);
        }
    };

    const handleItemSelect = (selectedId: string) => {
        if (!enrollment) {
            message.warning('Vui lòng ghi danh để xem nội dung bài học');
            return;
        }
        navigate(`/student/course/${id}/learning/${selectedId}`);
        // Scroll to top of player
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const [submitting, setSubmitting] = useState(false);
    const [submitModal, setSubmitModal] = useState<{ visible: boolean, homework: any } | null>(null);
    const [selectedHomeworkId, setSelectedHomeworkId] = useState<string | null>(null);
    const [githubLink, setGithubLink] = useState('');
    const [githubLinkError, setGithubLinkError] = useState('');
    const [note, setNote] = useState('');
    const [githubInfo, setGithubInfo] = useState<any>(null);
    const [checkingGithub, setCheckingGithub] = useState(false);

    const handleCheckGithub = async () => {
        if (!githubLink.trim()) {
            setGithubLinkError('Vui lòng nhập link GitHub');
            return;
        }
        setCheckingGithub(true);
        try {
            const res = await apiFetch<any>(`/upload/github-info?url=${encodeURIComponent(githubLink.trim())}`);
            setGithubInfo(res.data);
            setGithubLinkError('');
            message.success('Đã xác thực repository GitHub thành công!');
        } catch (err: any) {
            setGithubInfo(null);
            setGithubLinkError(err?.message || 'Không tìm thấy repository GitHub này hoặc ở chế độ Private');
        } finally {
            setCheckingGithub(false);
        }
    };

    const handleSubmitHomework = async () => {
        if (!submitModal || !enrollment) return;
        setGithubLinkError('');

        if (!githubLink.trim()) {
            setGithubLinkError('Vui lòng nhập link bài tập GitHub');
            return;
        }

        try {
            const url = new URL(githubLink);
            if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') {
                setGithubLinkError('Vui lòng nhập đường dẫn GitHub hợp lệ');
                return;
            }
        } catch (e) {
            setGithubLinkError('Vui lòng nhập đường dẫn GitHub hợp lệ');
            return;
        }

        setSubmitting(true);
        try {
            await apiFetch(`/upload/homework/${submitModal.homework.id}/submit`, {
                method: 'POST',
                body: JSON.stringify({
                    classId: enrollment.classId,
                    githubLink,
                    note
                })
            });
            message.success('Nộp bài thành công!');
            setSubmitModal(null);
            setGithubLink('');
            setGithubLinkError('');
            setNote('');
            
            const subsRes = await apiFetch<any>(`/upload/class/${enrollment.classId}/my-submissions`);
            setSubmissions(subsRes.data || []);
        } catch {
            message.error('Lỗi khi nộp bài, thử lại sau');
        } finally {
            setSubmitting(false);
        }
    };

    /** Đảm bảo có progress record cho bài học hiện tại; nếu chưa có thì tạo mới và lưu vào state */
    const ensureProgressRecord = async (lessonId: string): Promise<ProgressRecord | null> => {
        if (!enrollment || !user) return null;
        const existing = progressRecords.find(p => p.lessonId === lessonId);
        if (existing) return existing;
        try {
            const res = await apiFetch<any>('/progresses', {
                method: 'POST',
                body: JSON.stringify({
                    lesson: { id: lessonId },
                    student: { id: user.id },
                    completed: false,
                }),
            });
            const newRecord: ProgressRecord = {
                id: res.data?.id,
                lessonId,
                completed: false,
                videoWatchedSeconds: 0,
                videoDuration: 0,
            };
            setProgressRecords(prev => [...prev, newRecord]);
            return newRecord;
        } catch {
            return null;
        }
    };

    // Flatten lessons into display items (Videos first, then Quizzes), only for PUBLISHED lessons
    const displayItems = lessons
        .filter(lesson => lesson.status?.toLowerCase() === 'published')
        .flatMap((lesson, index) => {
            const items = [];

            // Add videos
            if (lesson.videos && lesson.videos.length > 0) {
                lesson.videos.forEach((v, vIdx) => {
                    items.push({
                        id: `${lesson.id}_v_${vIdx}`,
                        lessonId: lesson.id,
                        title: v.title || `Video ${vIdx + 1}`,
                        icon: <PlayCircleOutlined />,
                        type: 'video',
                        url: v.url,
                        duration: v.duration,
                        originalIndex: index + 1
                    });
                });
            }

            // Add quizzes
            if (lesson.quizzes && lesson.quizzes.length > 0) {
                lesson.quizzes.forEach((q, qIdx) => {
                    items.push({
                        id: `${lesson.id}_q_${qIdx}`,
                        lessonId: lesson.id,
                        title: q.title || `Bài tập ${qIdx + 1}`,
                        icon: <QuestionCircleOutlined />,
                        type: 'quiz',
                        quizData: q,
                        duration: 0, // Could be calculated
                        originalIndex: index + 1
                    });
                });
            }

            // If no video/quiz, add as document
            if ((!lesson.videos || lesson.videos.length === 0) && (!lesson.quizzes || lesson.quizzes.length === 0)) {
                items.push({
                    id: `${lesson.id}_d`,
                    lessonId: lesson.id,
                    title: lesson.title,
                    icon: <FileTextOutlined />,
                    type: 'document',
                    content: lesson.content,
                    duration: lesson.duration,
                    originalIndex: index + 1
                });
            }

            return items;
        });

    // Tính toán trạng thái khóa (lock) cho từng item
    let isPreviousCompleted = true; // Item đầu tiên luôn được mở
    const lockedItems = new Set<string>();
    
    displayItems.forEach(item => {
        if (!isPreviousCompleted) {
            lockedItems.add(item.id);
        }
        
        // Cập nhật isPreviousCompleted cho vòng lặp sau
        const pRec = progressRecords.find(p => p.lessonId === item.lessonId);
        isPreviousCompleted = pRec?.completed || !!pRec?.completedItems?.includes(item.id);
    });

    const handleItemSelectSafe = (itemId: string) => {
        if (enrollment?.class?.status === 'gathering' || enrollment?.class?.status === 'cancelled') {
            message.warning('Lớp học chưa chính thức bắt đầu hoặc đã bị hủy. Bạn chưa thể xem nội dung bài học.');
            return;
        }
        if (lockedItems.has(itemId)) {
            message.warning('Bạn cần hoàn thành nội dung trước đó để mở khóa nội dung này.');
            return;
        }
        handleItemSelect(itemId);
    };

    const courseLessonIds = new Set(lessons.map(l => l.id));
    const validProgressRecords = progressRecords.filter(p => p.lessonId && courseLessonIds.has(p.lessonId));

    const totalVideosCount = displayItems.filter(item => item.type === 'video').length;
    const completedVideosCount = displayItems.filter(item => {
        if (item.type !== 'video') return false;
        const pRec = validProgressRecords.find(p => p.lessonId === item.lessonId);
        return !!pRec?.completedItems?.includes(item.id);
    }).length;
    const progressPercent = totalVideosCount > 0 ? Math.round((completedVideosCount / totalVideosCount) * 100) : 0;

    const QuizHistory: React.FC<{ quizId: string }> = ({ quizId }) => {
        const [attempts, setAttempts] = React.useState<any[]>([]);
        const [loading, setLoading] = React.useState(true);

        React.useEffect(() => {
            const fetchAttempts = async () => {
                try {
                    const res = await apiFetch<any[]>(`/quiz-attempts?quizId=${quizId}`);
                    setAttempts(res.data || []);
                } catch (e) {
                    console.error('Error fetching quiz history:', e);
                } finally {
                    setLoading(false);
                }
            };
            fetchAttempts();
        }, [quizId]);

        return (
            <Table
                dataSource={attempts}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 8 }}
                columns={[
                    {
                        title: 'Ngày làm bài',
                        dataIndex: 'createdAt',
                        key: 'createdAt',
                        render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm')
                    },
                    {
                        title: 'Số câu đúng',
                        key: 'correct',
                        render: (_, record) => `${record.totalCorrect} câu`
                    },
                    {
                        title: 'Điểm số',
                        dataIndex: 'score',
                        key: 'score',
                        render: (score) => (
                            <Text strong className={score >= 8 ? 'text-success' : 'text-warning'}>
                                {score}
                            </Text>
                        )
                    },
                    {
                        title: 'Kết quả',
                        dataIndex: 'passed',
                        key: 'passed',
                        render: (passed) => (
                            <Tag color={passed ? 'success' : 'warning'}>
                                {passed ? 'Đạt' : 'Chưa đạt'}
                            </Tag>
                        )
                    }
                ]}
            />
        );
    };

    const activeLessonId = itemId?.replace('_history', '')?.replace('_hw', '');
    const rawActiveItem = displayItems.find(item => item.id === activeLessonId) || displayItems.find(item => item.lessonId === activeLessonId);
    
    const activeItem = rawActiveItem ? {
        ...rawActiveItem,
        type: itemId?.endsWith('_history') ? 'history' : itemId?.endsWith('_hw') ? 'hw' : rawActiveItem.type
    } : null;
    const activeLesson = activeItem ? lessons.find(l => l.id === activeItem.lessonId) : null;

    React.useEffect(() => {
        if (activeItem) {
            if (activeItem.type === 'quiz') setActiveTab('2');
            else if (activeItem.type === 'history') setActiveTab('3');
            else if (activeItem.type === 'hw') setActiveTab('5');
            else setActiveTab('1');
        }
    }, [activeItem?.id, activeItem?.type]);
    const totalDuration = displayItems.reduce((acc, item) => acc + (item.duration || 0), 0);

    useEffect(() => {
        const fetchAttachments = async () => {
            if (!activeLesson?.id) {
                setLessonAttachments([]);
                return;
            }
            try {
                const res = await apiFetch<any[]>(`/upload/lesson/${activeLesson.id}/attachments`);
                setLessonAttachments(Array.isArray(res.data) ? res.data : []);
            } catch (e) {
                console.error('Error fetching attachments:', e);
            }
        };
        fetchAttachments();
    }, [activeLesson?.id]);

    // Tự động tạo progress record khi học viên mở bài học (bất kể có video hay quiz)
    useEffect(() => {
        if (activeLesson?.id && enrollment && user) {
            ensureProgressRecord(activeLesson.id);
        }

        // Set default selected homework when lesson changes
        if (activeLesson?.homeworks?.length > 0) {
            setSelectedHomeworkId(activeLesson.homeworks[0].id);
        } else {
            setSelectedHomeworkId(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeLesson?.id, enrollment?.id, user?.id]);

    const formatDuration = (seconds: number) => {
        if (!seconds) return '0 giây';
        if (seconds < 60) return `${Math.round(seconds)} giây`;
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return secs > 0 ? `${mins} phút ${secs} giây` : `${mins} phút`;
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <Spin size="large" />
                    <Text type="secondary">Đang tải dữ liệu...</Text>
                </div>
            </DashboardLayout>
        );
    }

    if (!course) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Empty description="Không tìm thấy khóa học" />
                </div>
            </DashboardLayout>
        );
    }

    const isEnrolled = !!enrollment;

    // Tính toán tiến độ dựa trên số lượng Item thay vì số lượng Lesson
    // Xóa khai báo completedCount cũ ở đây để chuyển xuống dưới

    // Kiểm tra bài học hiện tại đã hoàn thành chưa (dùng để cho phép tua và mở khóa tab quiz)
    const currentProgressRecord = activeLesson
        ? validProgressRecords.find(p => p.lessonId === activeLesson.id) ?? null
        : null;
    const isCurrentLessonCompleted = currentProgressRecord
        ? (currentProgressRecord.completed === true ||
           (currentProgressRecord.videoWatchedSeconds && currentProgressRecord.videoDuration &&
            currentProgressRecord.videoDuration > 0 &&
            currentProgressRecord.videoWatchedSeconds / currentProgressRecord.videoDuration >= 0.9))
        : false;
    const lessonVideos = activeLesson 
        ? displayItems.filter(item => item.lessonId === activeLesson.id && item.type === 'video')
        : [];
    const hasVideoInLesson = lessonVideos.length > 0;
    const allVideosWatched = currentProgressRecord?.completed === true || (
        lessonVideos.length > 0 && lessonVideos.every(v => (currentProgressRecord?.completedItems || []).includes(v.id))
    );
    const quizLocked = hasVideoInLesson && !allVideosWatched;

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in max-w-[1700px] mx-auto px-4">
                {/* Breadcrumb & Navigation */}
                <div className="flex items-center justify-between py-4">
                    <Breadcrumb
                        items={[
                            { title: <a onClick={() => navigate('/student/my-courses')}>Khóa học của tôi</a> },
                            { title: <a onClick={() => navigate(`/student/course/${id}`)}>{course.title}</a> },
                            { title: activeItem ? activeItem.title : 'Tổng quan' },
                        ]}
                    />
                    <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={() => itemId ? navigate(`/student/course/${id}`) : navigate('/student/my-courses')}
                        type="text"
                    >
                        {itemId ? 'Về trang tổng quan' : 'Quay lại danh sách'}
                    </Button>
                </div>

                {/* Conditional Rendering: Player vs Overview */}
                {itemId && activeItem && activeLesson && isEnrolled && !['gathering', 'cancelled'].includes(enrollment?.class?.status || '') ? (
                    /* Learning / Player Mode */
                    <div className="space-y-4">
                        <Row gutter={[24, 24]}>
                            {/* Cột bọc ngoài cùng giờ sẽ luôn chiếm 100% chiều rộng (span={24}) */}
                            <Col span={24}>
                                <div className="animate-slide-up space-y-8">
                                    <Tabs
                                        className="learning-tabs"
                                        activeKey={activeTab}
                                        onChange={(key) => {
                                            setActiveTab(key);
                                            if (key === '1') {
                                                const contentItem = displayItems.find(item => item.lessonId === activeLesson.id && (item.type === 'video' || item.type === 'document'));
                                                if (contentItem && activeItem.type !== 'video' && activeItem.type !== 'document') {
                                                    handleItemSelect(contentItem.id);
                                                }
                                            } else if (key === '2') {
                                                const quizItem = displayItems.find(item => item.lessonId === activeLesson.id && item.type === 'quiz');
                                                if (quizItem && activeItem.type !== 'quiz') {
                                                    handleItemSelect(quizItem.id);
                                                }
                                            } else if (key === '3') {
                                                const quizItem = displayItems.find(item => item.lessonId === activeLesson.id && item.type === 'quiz');
                                                if (quizItem && activeItem.type !== 'history') {
                                                    handleItemSelect(quizItem.id + '_history');
                                                }
                                            } else if (key === '5') {
                                                if (activeItem.type !== 'hw') {
                                                    handleItemSelect(activeLesson.id + '_hw');
                                                }
                                            }
                                        }}
                                        items={[
                                            {
                                                key: '1',
                                                label: <span className="flex items-center gap-2 px-4 py-1"><PlayCircleOutlined /> Video bài học</span>,
                                                children: (
                                                    // Row mới để chia tỷ lệ Video và Sidebar bên trong Tab 1
                                                    <Row gutter={[24, 24]}>
                                                        {/* Cột chứa Nội dung (Video/Document) */}
                                                        <Col xs={24} xl={18} lg={17}>
                                                            <div className="space-y-6">
                                                                {activeItem.type === 'video' && (
                                                                    <div className="aspect-video rounded-3xl overflow-hidden shadow-2xl bg-black">
                                                                        <VideoPlayer
                                                                            url={activeItem.url}
                                                                            title={activeItem.title}
                                                                            progressId={currentProgressRecord?.id}
                                                                            initialWatchedSeconds={(() => {
                                                                                if (!currentProgressRecord) return 0;
                                                                                const isCompleted = !!currentProgressRecord?.completed || !!currentProgressRecord?.completedItems?.includes(activeItem.id);
                                                                                if (isCompleted) return 0;
                                                                                if (lessonVideos.length === 1) return currentProgressRecord.videoWatchedSeconds ?? 0;
                                                                                return 0;
                                                                            })()}
                                                                            isCompleted={!!currentProgressRecord?.completed || !!currentProgressRecord?.completedItems?.includes(activeItem.id)}
                                                                            onComplete={async () => {
                                                                                await handleMarkItemComplete(activeLesson.id, activeItem.id);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                )}
                                                                {activeItem.type === 'document' && (
                                                                    <Card className="shadow-soft border-0 min-h-[500px] rounded-3xl">
                                                                        <div className="p-8 space-y-6">
                                                                            <div className="flex items-center gap-4 text-primary">
                                                                                <FileTextOutlined className="text-3xl" />
                                                                                <Title level={2} className="!m-0">{activeItem.title}</Title>
                                                                            </div>
                                                                            <Divider />
                                                                            <div className="prose max-w-none text-slate-700 text-lg leading-relaxed"
                                                                                dangerouslySetInnerHTML={{ __html: activeItem.content || 'Nội dung bài học đang được cập nhật...' }} />
                                                                        </div>
                                                                    </Card>
                                                                )}
                                                                {activeItem.type === 'quiz' && (
                                                                    <div className="py-20 text-center text-slate-400 bg-white rounded-3xl shadow-soft">
                                                                        <PlayCircleOutlined style={{ fontSize: 48 }} className="mb-4 block opacity-20" />
                                                                        <p>Hãy chọn bài giảng video hoặc tài liệu ở sidebar để bắt đầu học.</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </Col>

                                                        {/* Cột chứa Sidebar - Được chuyển vào đây */}
                                                        <Col xs={24} xl={6} lg={7}>
                                                            <Card className="shadow-soft border-0 h-full flex flex-col max-h-[85vh] sticky top-6 rounded-3xl overflow-hidden">
                                                                <div className="p-5 border-b border-slate-100">
                                                                    {(() => {
                                                                        const lessonVideoItems = displayItems.filter(item => item.lessonId === activeLesson?.id && item.type === 'video');
                                                                        const lessonTotalVideos = lessonVideoItems.length;
                                                                        const lessonCompletedVideos = lessonVideoItems.filter(item => {
                                                                            const pRec = validProgressRecords.find(p => p.lessonId === item.lessonId);
                                                                            return !!pRec?.completedItems?.includes(item.id);
                                                                        }).length;
                                                                        const lessonProgressPercent = lessonTotalVideos > 0 ? Math.round((lessonCompletedVideos / lessonTotalVideos) * 100) : 0;
                                                                        
                                                                        return (
                                                                            <>
                                                                                <div className="flex justify-between items-center mb-4">
                                                                                    <Title level={4} className="m-0 text-lg">Danh sách video</Title>
                                                                                </div>
                                                                                <Progress 
                                                                                    percent={lessonProgressPercent} 
                                                                                    strokeColor="#0066cc" 
                                                                                    size="small" 
                                                                                    className="m-0" 
                                                                                    format={() => <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full font-medium">{lessonCompletedVideos}/{lessonTotalVideos}</span>}
                                                                                />
                                                                            </>
                                                                        );
                                                                    })()}
                                                                </div>

                                                                <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-6">
                                                                    {(() => {
                                                                        const lesson = activeLesson;
                                                                        if (!lesson) return null;

                                                                        const lessonItems = displayItems.filter(item => item.lessonId === lesson.id && item.type !== 'quiz');
                                                                        // Tính toán isLessonDone dựa vào việc đã học xong tất cả các item trong lesson chưa
                                                                        const isLessonDone = lessonItems.length > 0 && lessonItems.every(item => 
                                                                            progressRecords.find(p => p.lessonId === lesson.id)?.completedItems?.includes(item.id)
                                                                        );
                                                                        const lessonIndex = lessons.findIndex(l => l.id === lesson.id);
                                                                        const nextLesson = lessons[lessonIndex + 1];

                                                                        return (
                                                                            <div key={lesson.id} className="space-y-4">
                                                                                <div className="space-y-2">
                                                                                    <div className={`px-2 py-1 flex items-center justify-between mb-2`}>
                                                                                        <Text className={`text-[10px] font-bold uppercase tracking-widest text-primary`}>
                                                                                            Bài {lessonIndex + 1}: {lesson.title}
                                                                                        </Text>
                                                                                        {isLessonDone && <CheckCircleFilled className="text-success text-[10px]" />}
                                                                                    </div>

                                                                                    <div className="space-y-1">
                                                                                        {lessonItems.filter(item => item.type !== 'quiz' && !item.id.includes('_q_')).map((item) => {
                                                                                            const isActive = activeItem?.id === item.id;
                                                                                            return (
                                                                                                <div
                                                                                                    key={item.id}
                                                                                                    className={`group flex items-center gap-3 p-3 rounded-xl transition-all border ${lockedItems.has(item.id) ? 'opacity-50 cursor-not-allowed bg-slate-50 border-transparent' : isActive ? 'bg-primary/5 border-primary/20 shadow-sm cursor-pointer' : 'border-transparent hover:bg-slate-50 cursor-pointer'}`}
                                                                                                    onClick={() => handleItemSelectSafe(item.id)}
                                                                                                >
                                                                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm ${isActive ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-white transition-all'}`}>
                                                                                                        {item.icon}
                                                                                                    </div>
                                                                                                    <div className="flex-grow min-w-0">
                                                                                                        <div className={`text-[13px] font-semibold truncate ${isActive ? 'text-primary' : 'text-slate-600'}`}>
                                                                                                            {item.title}
                                                                                                        </div>
                                                                                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-bold">
                                                                                                            <span>{item.type}</span>
                                                                                                            {item.duration > 0 && <span>• {formatDuration(item.duration)}</span>}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    {progressRecords.find(p => p.lessonId === lesson.id)?.completedItems?.includes(item.id) ? (
                                                                                                        <CheckCircleFilled className="text-success text-sm" />
                                                                                                    ) : lockedItems.has(item.id) ? (
                                                                                                        <LockOutlined className="text-slate-300 text-sm" />
                                                                                                    ) : (
                                                                                                        isActive && <RightOutlined className="text-primary text-[10px]" />
                                                                                                    )}
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </Card>
                                                        </Col>
                                                    </Row>
                                                )
                                            },
                                            {
                                                key: '4',
                                                label: <span className="flex items-center gap-2 px-4 py-1"><PaperClipOutlined /> Tài liệu học tập</span>,
                                                children: (
                                                    // Phần children của Tab 4 giữ nguyên
                                                    <div className="animate-fade-in">
                                                        {activeLesson && (
                                                            <Card className="shadow-soft border-0 rounded-2xl p-6 min-h-[500px]">
                                                                <div className="flex items-center gap-2 mb-6">
                                                                    <PaperClipOutlined className="text-primary text-xl" />
                                                                    <Title level={4} className="m-0">Tài liệu đính kèm</Title>
                                                                </div>

                                                                {lessonAttachments.length > 0 ? (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        {[
                                                                            { key: 'slide', label: 'Slide bài giảng' },
                                                                            { key: 'code', label: 'Code mẫu' },
                                                                            { key: 'diagram', label: 'Sơ đồ' },
                                                                            { key: 'other', label: 'Khác' }
                                                                        ].map((category) => {
                                                                            const filtered = lessonAttachments.filter(att => att.category === category.key);
                                                                            if (filtered.length === 0) return null;

                                                                            return (
                                                                                <div key={category.key} className="bg-slate-50 p-4 rounded-xl">
                                                                                    <Text strong className="text-slate-600 block mb-2">{category.label}</Text>
                                                                                    <List
                                                                                        dataSource={filtered}
                                                                                        renderItem={(att) => (
                                                                                            <List.Item
                                                                                                className="px-2 py-1 border-0"
                                                                                                extra={
                                                                                                    <Button
                                                                                                        type="link"
                                                                                                        icon={<DownloadOutlined />}
                                                                                                        href={att.fileUrl.startsWith('http') ? att.fileUrl : `${import.meta.env.VITE_API_URL || ''}${att.fileUrl}`}
                                                                                                        target="_blank"
                                                                                                        className="p-0"
                                                                                                    />
                                                                                                }
                                                                                            >
                                                                                                <List.Item.Meta
                                                                                                    avatar={<FileTextOutlined className="text-primary" />}
                                                                                                    title={<Text strong className="text-xs">{att.title}</Text>}
                                                                                                    description={<Text type="secondary" style={{ fontSize: 10 }}>{Math.round(att.fileSize / 1024)} KB</Text>}
                                                                                                />
                                                                                            </List.Item>
                                                                                        )}
                                                                                    />
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                ) : (
                                                                    <div className="py-20 text-center text-slate-400 bg-white rounded-3xl shadow-soft">
                                                                        <PaperClipOutlined style={{ fontSize: 48 }} className="mb-4 block opacity-20" />
                                                                        <p>Không có tài liệu đính kèm cho bài học này.</p>
                                                                    </div>
                                                                )}
                                                            </Card>
                                                        )}
                                                    </div>
                                                )
                                            },
                                            ...(activeLesson?.quizzes && activeLesson.quizzes.length > 0 ? [
                                                {
                                                    key: '2',
                                                    disabled: quizLocked,
                                                    label: quizLocked
                                                        ? (
                                                            <Tooltip title="Bạn cần xem hết video bài học trước khi làm bài tập">
                                                                <span className="flex items-center gap-2 px-4 py-1 opacity-50 cursor-not-allowed">
                                                                    <LockOutlined />
                                                                    Bài tập trắc nghiệm
                                                                </span>
                                                            </Tooltip>
                                                        )
                                                        : <span className="flex items-center gap-2 px-4 py-1"><QuestionCircleOutlined /> Bài tập trắc nghiệm</span>,
                                                    children: (
                                                        // Phần children của Tab 2 giữ nguyên
                                                        <div className="animate-fade-in">
                                                            {(() => {
                                                                const lessonQuiz = displayItems.find(item => item.lessonId === activeLesson.id && item.type === 'quiz');
                                                                if (!lessonQuiz) return (
                                                                    <div className="py-20 text-center text-slate-400 bg-white rounded-3xl shadow-soft">
                                                                        <QuestionCircleOutlined style={{ fontSize: 48 }} className="mb-4 block opacity-20" />
                                                                        <p>Bài học này không có bài tập trắc nghiệm.</p>
                                                                    </div>
                                                                );
                                                                return (
                                                                    <div className="w-full">
                                                                        <div className="bg-white rounded-3xl shadow-soft overflow-hidden p-4 md:p-10 border border-slate-100">
                                                                            <QuizPlayer
                                                                                quiz={lessonQuiz.quizData}
                                                                                onComplete={() => handleMarkItemComplete(lessonQuiz.lessonId, lessonQuiz.id)}
                                                                                onNext={() => {
                                                                                    const currentIndex = displayItems.findIndex(item => item.id === lessonQuiz.id);
                                                                                    const nextItem = displayItems[currentIndex + 1];
                                                                                    if (nextItem) handleItemSelectSafe(nextItem.id);
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )
                                                },
                                                {
                                                    key: '3',
                                                    label: <span className="flex items-center gap-2 px-4 py-1"><HistoryOutlined /> Lịch sử làm bài</span>,
                                                    children: (
                                                        // Phần children của Tab 3 giữ nguyên
                                                        <div className="animate-fade-in">
                                                            {(() => {
                                                                const lessonQuiz = displayItems.find(item => item.lessonId === activeLesson.id && item.type === 'quiz');
                                                                if (!lessonQuiz) return (
                                                                    <div className="py-20 text-center text-slate-400 bg-white rounded-3xl shadow-soft">
                                                                        <HistoryOutlined style={{ fontSize: 48 }} className="mb-4 block opacity-20" />
                                                                        <p>Không có dữ liệu lịch sử.</p>
                                                                    </div>
                                                                );
                                                                return (
                                                                    <Card className="shadow-soft border-0 rounded-3xl p-6">
                                                                        <Title level={4} className="mb-6">Lịch sử làm bài: {lessonQuiz.title}</Title>
                                                                        <QuizHistory quizId={lessonQuiz.quizData.id} />
                                                                    </Card>
                                                                );
                                                            })()}
                                                        </div>
                                                    )
                                                }
                                            ] : []),
                                            ...(activeLesson?.homeworks && activeLesson.homeworks.length > 0 ? [
                                                {
                                                    key: '5',
                                                    disabled: quizLocked,
                                                    label: quizLocked
                                                        ? (
                                                            <Tooltip title="Bạn cần xem hết video bài học trước khi làm bài tập">
                                                                <span className="flex items-center gap-2 px-4 py-1 opacity-50 cursor-not-allowed">
                                                                    <LockOutlined />
                                                                    Bài tập về nhà
                                                                </span>
                                                            </Tooltip>
                                                        )
                                                        : <span className="flex items-center gap-2 px-4 py-1"><FileTextOutlined /> Bài tập về nhà</span>,
                                                    children: (
                                                        <div className="animate-fade-in">
                                                            {(!activeLesson.homeworks || activeLesson.homeworks.length === 0) ? (
                                                                <div className="py-20 text-center text-slate-400 bg-white rounded-3xl shadow-soft">
                                                                    <FileTextOutlined style={{ fontSize: 48 }} className="mb-4 block opacity-20" />
                                                                    <p>Bài học này chưa có bài tập về nhà nào.</p>
                                                                </div>
                                                            ) : (
                                                                <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 flex flex-col md:flex-row">
                                                                    {/* Left Content Column */}
                                                                    <div className="flex-1 p-6 md:p-8 border-r border-slate-100 max-h-[700px] overflow-y-auto custom-scrollbar">
                                                                        {(() => {
                                                                            const hw = activeLesson.homeworks.find((h: any) => h.id === selectedHomeworkId) || activeLesson.homeworks[0];
                                                                            if (!hw) return null;
                                                                            const hwSubmission = submissions?.find((s: any) => s.homeworkId === hw.id);
                                                                            const isSubmitted = !!hwSubmission;
                                                                            const isLate = hwSubmission?.isLate || false;
                                                                            const isGraded = hwSubmission?.status === 'GRADED';
                                                                            const isReturned = hwSubmission?.status === 'RETURNED';
                                                                            
                                                                            return (
                                                                                <div className="flex flex-col">
                                                                                    <div>
                                                                                        <Title level={3} className="mb-6 text-slate-800">
                                                                                            {hw.level ? `[${hw.level}] ` : ''}{hw.title}
                                                                                        </Title>
                                                                                        {hw.description && (
                                                                                            <div className="mb-8 prose max-w-none text-slate-800" dangerouslySetInnerHTML={{ __html: hw.description }} />
                                                                                        )}
                                                                                    </div>
                                                                                    
                                                                                    <div className="mt-4 pt-6 border-t border-slate-100">
                                                                                        {/* Submission info */}
                                                                                        {isSubmitted && (
                                                                                            <div className={`p-4 rounded-xl mb-6 border ${isReturned ? 'bg-orange-50 border-orange-200' : isGraded ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'}`}>
                                                                                                <div className="flex items-center gap-2 mb-3">
                                                                                                    {isGraded ? (
                                                                                                        <CheckCircleFilled className="text-success text-lg" />
                                                                                                    ) : isReturned ? (
                                                                                                        <span className="text-orange-500 text-lg">⚠️</span>
                                                                                                    ) : (
                                                                                                        <CheckCircleFilled className="text-blue-400 text-lg" />
                                                                                                    )}
                                                                                                    <Text strong className="text-lg">
                                                                                                    {isGraded ? 'Đã hoàn thành' : isReturned ? 'Cần làm lại' : 'Đã nộp'}
                                                                                                    {isLate && <Tag color="orange" className="ml-2">Nộp muộn</Tag>}
                                                                                                    {isGraded && <Tag color="success" className="ml-2">Đã chấm</Tag>}
                                                                                                    {isReturned && <Tag color="warning" className="ml-2">Trả bài</Tag>}
                                                                                                </Text>
                                                                                            </div>
                                                                                            <div className="space-y-2 text-sm">
                                                                                                <div>
                                                                                                    <Text type="secondary">Link đã nộp: </Text>
                                                                                                    <a href={hwSubmission.githubLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">{hwSubmission.githubLink}</a>
                                                                                                </div>
                                                                                                {hwSubmission.note && (
                                                                                                    <div><Text type="secondary">Ghi chú của bạn: </Text> <Text>{hwSubmission.note}</Text></div>
                                                                                                )}
                                                                                                {hwSubmission.teacherFeedback && (
                                                                                                    <div className={`mt-2 pt-2 border-t ${isReturned ? 'border-orange-200' : 'border-slate-200'}`}>
                                                                                                        <Text type="secondary">{isReturned ? 'Lý do trả bài: ' : 'Nhận xét giáo viên: '}</Text>
                                                                                                        <span className={`italic ${isReturned ? 'text-orange-700' : 'text-slate-600'}`}>{hwSubmission.teacherFeedback}</span>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                    
                                                                                    {/* Submit Button - ẩn nếu đã chấm xong */}
                                                                                    {!isGraded && (
                                                                                        <Button 
                                                                                            type={isSubmitted ? (isReturned ? 'primary' : 'default') : 'primary'}
                                                                                            size="large" 
                                                                                            danger={isReturned}
                                                                                            className={`w-full sm:w-auto px-8 font-medium`}
                                                                                            onClick={() => {
                                                                                                setSubmitModal({ visible: true, homework: hw });
                                                                                                if (hwSubmission) {
                                                                                                    setGithubLink(hwSubmission.githubLink || '');
                                                                                                    setNote(hwSubmission.note || '');
                                                                                                } else {
                                                                                                    setGithubLink('');
                                                                                                    setNote('');
                                                                                                }
                                                                                            }}
                                                                                        >
                                                                                            {isReturned ? 'Nộp lại (Sau khi sửa)' : isSubmitted ? 'Nộp lại bài tập' : 'Nộp bài'}
                                                                                        </Button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>

                                                                {/* Right Sidebar List Column */}
                                                                <div className="w-full md:w-[320px] lg:w-[380px] bg-slate-50/50 flex flex-col border-t md:border-t-0 md:border-l border-slate-100">
                                                                    <div className="p-4 border-b border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                                                                        <Text strong className="text-slate-800 text-base">Bài tập về nhà</Text>
                                                                    </div>
                                                                    <div className="p-3 space-y-2 flex-grow overflow-y-auto custom-scrollbar max-h-[700px]">
                                                                        {activeLesson.homeworks.map((hw: any) => {
                                                                            const isSelected = selectedHomeworkId === hw.id || (!selectedHomeworkId && activeLesson.homeworks[0].id === hw.id);
                                                                            const hwSubmission = submissions?.find((s: any) => s.homeworkId === hw.id);
                                                                            const isSubmitted = !!hwSubmission;
                                                                            const isGraded = hwSubmission?.status === 'GRADED';
                                                                            const isReturned = hwSubmission?.status === 'RETURNED';
                                                                            
                                                                            const statusBadge = isGraded ? (
                                                                                <span className="text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">✅ Đã chấm</span>
                                                                            ) : isReturned ? (
                                                                                <span className="text-[10px] font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">⚠️ Trả bài</span>
                                                                            ) : isSubmitted ? (
                                                                                <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">📤 Đã nộp</span>
                                                                            ) : (
                                                                                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">Chưa nộp</span>
                                                                            );
                                                                            
                                                                            return (
                                                                                <div 
                                                                                    key={hw.id}
                                                                                    className={`p-3 rounded-xl cursor-pointer transition-all duration-200 ${isSelected ? 'bg-white shadow-sm border border-primary/20' : 'hover:bg-slate-100 border border-transparent'}`}
                                                                                    onClick={() => setSelectedHomeworkId(hw.id)}
                                                                                >
                                                                                    <div className="flex items-start gap-3">
                                                                                        <FileTextOutlined className={`mt-1 text-lg ${isSelected ? 'text-primary' : 'text-slate-400'}`} />
                                                                                        <div>
                                                                                            <Text className={`block text-sm leading-tight ${isSelected ? 'font-semibold text-primary' : 'text-slate-700'}`}>
                                                                                                {hw.level ? `[${hw.level}] ` : ''}{hw.title}
                                                                                            </Text>
                                                                                            <div className="mt-2 flex items-center gap-2">
                                                                                                {statusBadge}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            }
                                            ] : [])
                                        ]}
                                    />
                                </div>
                            </Col>
                        </Row>
                    </div>
                ) : (
                    /* Overview Mode (No itemId) */
                    <div className="space-y-12">
                        {/* Course Hero */}
                        <div className="relative rounded-[2.5rem] overflow-hidden bg-slate-900 text-white p-10 border border-slate-800 shadow-2xl">
                            <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-primary/20 to-transparent pointer-events-none" />
                            <Row gutter={[48, 24]} align="middle">
                                <Col xs={24} md={14}>
                                    <div className="space-y-8 relative z-10">
                                        <Space direction="vertical" size={2}>
                                            <Title className="!text-white !m-0 text-3xl md:text-5xl font-extrabold leading-tight">
                                                {course.title}
                                            </Title>
                                        </Space>
                                        <div>
                                            <Paragraph
                                                className={`text-slate-300 text-base md:text-lg leading-relaxed mb-1 ${descExpanded ? '' : 'line-clamp-3'}`}
                                            >
                                                {course.description}
                                            </Paragraph>
                                            <Button
                                                type="link"
                                                onClick={() => setDescExpanded(!descExpanded)}
                                                className="text-primary p-0 h-auto font-bold hover:text-primary/80"
                                            >
                                                {descExpanded ? 'Thu gọn' : '... Xem thêm'}
                                            </Button>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-10 text-slate-400">
                                            <div className="flex items-center gap-3">
                                                <Avatar size="large" src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${course.teacher?.id || 'Instructor'}`} className="border-2 border-primary/30" />
                                                <div className="flex flex-col">
                                                    <Text className="text-slate-400 text-[10px] uppercase font-bold">Giảng viên</Text>
                                                    <Text className="text-white font-bold">{course.teacher?.fullName || 'Giáo viên hệ thống'}</Text>
                                                </div>
                                            </div>
                                            <div className="flex flex-col">
                                                <Text className="text-slate-400 text-[10px] uppercase font-bold">Thời lượng</Text>
                                                <Text className="text-white font-bold">{formatDuration(totalDuration)}</Text>
                                            </div>
                                            <div className="flex flex-col">
                                                <Text className="text-slate-400 text-[10px] uppercase font-bold">Cấu trúc</Text>
                                                <Text className="text-white font-bold">{lessons.length} bài học</Text>
                                            </div>
                                        </div>

                                        <div className="pt-4">
                                            {isEnrolled ? (
                                                <Button
                                                    type="primary"
                                                    size="large"
                                                    icon={<PlayCircleOutlined />}
                                                    className="h-16 px-12 rounded-2xl text-lg font-bold shadow-2xl hover:scale-105 transition-transform bg-primary"
                                                    onClick={() => document.getElementById('lesson-list')?.scrollIntoView({ behavior: 'smooth' })}
                                                >
                                                    Bắt đầu học ngay
                                                </Button>
                                            ) : (
                                                <Card className="bg-white/5 border-white/10 backdrop-blur-md rounded-3xl max-w-md border-0">
                                                    <Title level={5} className="!text-white !m-0 mb-3">Thông tin ghi danh</Title>
                                                    <Text className="text-slate-400 block mb-6">Bạn chưa có quyền truy cập nội dung này. Vui lòng liên hệ trung tâm để được hỗ trợ.</Text>
                                                    <Button size="large" block disabled className="h-14 rounded-2xl">Yêu cầu tham gia</Button>
                                                </Card>
                                            )}
                                        </div>
                                    </div>
                                </Col>
                                <Col xs={24} md={10} className="hidden md:block">
                                    <div className="relative group">
                                        <div className="absolute -inset-4 bg-primary/20 rounded-[3rem] blur-2xl group-hover:bg-primary/30 transition-all" />
                                        <img
                                            src={course.coverImage || course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80'}
                                            alt={course.title}
                                            className="relative w-full h-auto rounded-[2.5rem] shadow-2xl border-2 border-white/10"
                                        />
                                    </div>
                                </Col>
                            </Row>
                        </div>

                        {/* Overview Content: Syllabus & Details */}
                        <Row gutter={[32, 32]}>
                            <Col xs={24}>
                                <div className="space-y-8">
                                    <Card id="lesson-list" className="shadow-soft border-0 rounded-[2rem] p-4">
                                        <div className="flex items-center justify-between mb-8 px-4 py-2 border-l-4 border-primary">
                                            <div>
                                                <Title level={4} className="!m-0 capitalize">Danh sách bài học</Title>
                                                <Text type="secondary">Tổng cộng {lessons.length} bài học chính</Text>
                                            </div>
                                            <Tag color="blue" className="rounded-full px-4 py-1">Lộ trình học</Tag>
                                        </div>

                                        <div className="max-h-[800px] overflow-y-auto px-2">
                                            <List
                                                itemLayout="horizontal"
                                                dataSource={lessons.filter(l => l.status?.toLowerCase() === 'published')}
                                                renderItem={(lesson, index) => {
                                                    const record = progressRecords.find(p => p.lessonId === lesson.id);
                                                    const isDone = record?.completed;

                                                    // Find first item of this lesson to navigate to
                                                    const firstItem = displayItems.find(item => item.lessonId === lesson.id);

                                                    // Content summary
                                                    const videoCount = lesson.videos?.length || 0;
                                                    const quizCount = lesson.quizzes?.length || 0;

                                                    return (
                                                        <div
                                                            className={`group flex items-center justify-between p-5 mb-4 rounded-[1.5rem] bg-slate-50 border transition-all ${firstItem && lockedItems.has(firstItem.id) ? 'opacity-50 cursor-not-allowed border-transparent' : 'hover:bg-primary/5 border-transparent hover:border-primary/20 cursor-pointer'}`}
                                                            onClick={() => firstItem && handleItemSelectSafe(firstItem.id)}
                                                        >
                                                            <div className="flex items-center gap-5">
                                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all ${isDone ? 'bg-success/10 text-success' : firstItem && lockedItems.has(firstItem.id) ? 'bg-slate-200 text-slate-400' : 'bg-white text-slate-400 group-hover:bg-primary group-hover:text-white shadow-sm'}`}>
                                                                    {isDone ? <CheckCircleFilled /> : firstItem && lockedItems.has(firstItem.id) ? <LockOutlined /> : <PlayCircleOutlined />}
                                                                </div>
                                                                <div>
                                                                    <Text className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-1">BÀI {index + 1}</Text>
                                                                    <Title level={5} className="!m-0 group-hover:text-primary transition-colors">{lesson.title}</Title>
                                                                    <Space split={<Divider type="vertical" />} className="text-[11px] text-slate-500 mt-1">
                                                                        {videoCount > 0 && <span>{videoCount} Video</span>}
                                                                        {quizCount > 0 && <span>{quizCount} Bài tập</span>}
                                                                        {(() => {
                                                                            const d = lesson.videos?.reduce((a, v) => a + (v.duration || 0), 0) || 0;
                                                                            return d > 0 ? <span>{formatDuration(d)}</span> : null;
                                                                        })()}
                                                                    </Space>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-6">
                                                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                                                    <DoubleRightOutlined className="text-[10px]" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }}
                                            />
                                        </div>
                                    </Card>

                                </div>
                            </Col>
                        </Row>
                    </div>
                )}
            </div>
            
            {/* Modal Nộp bài */}
            <Modal
                title={submitModal?.homework?.title}
                open={!!submitModal}
                onCancel={() => {
                    setSubmitModal(null);
                    setGithubLink('');
                    setGithubLinkError('');
                    setNote('');
                    setGithubInfo(null);
                }}
                onOk={handleSubmitHomework}
                confirmLoading={submitting}
                okText="Nộp bài"
                cancelText="Hủy"
            >
                <Form layout="vertical" className="mt-4">
                    <Form.Item 
                        label="Link bài tập (GitHub)" 
                        required
                        validateStatus={githubLinkError ? 'error' : ''}
                        help={githubLinkError}
                    >
                        <Space.Compact style={{ width: '100%' }}>
                            <Input
                                placeholder="Ví dụ: https://github.com/username/repository"
                                value={githubLink}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setGithubLink(val);
                                    setGithubInfo(null);
                                    if (!val.trim()) {
                                        setGithubLinkError('Vui lòng nhập link bài tập GitHub');
                                        return;
                                    }
                                    try {
                                        const url = new URL(val);
                                        if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') {
                                            setGithubLinkError('Vui lòng nhập đường dẫn GitHub hợp lệ');
                                        } else {
                                            setGithubLinkError('');
                                        }
                                    } catch {
                                        setGithubLinkError('Vui lòng nhập đường dẫn GitHub hợp lệ');
                                    }
                                }}
                            />
                            <Button 
                                type="primary"
                                icon={<SearchOutlined />}
                                loading={checkingGithub}
                                onClick={handleCheckGithub}
                            >
                                Kiểm tra Repo
                            </Button>
                        </Space.Compact>
                    </Form.Item>

                    {githubInfo && (
                        <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl animate-fade-in text-xs space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                                    <GithubOutlined className="text-base" /> {githubInfo.fullName}
                                </div>
                                <Tag color="green" className="m-0 flex items-center gap-1">
                                    <CheckCircleOutlined /> Repo hợp lệ
                                </Tag>
                            </div>
                            <div className="text-slate-500">{githubInfo.description}</div>
                            <div className="flex flex-wrap gap-2 pt-1">
                                <Tag color="blue">{githubInfo.language || 'Code'}</Tag>
                                <Tag>⭐ {githubInfo.stars} stars</Tag>
                                <Tag>🌿 Branch: {githubInfo.defaultBranch}</Tag>
                            </div>
                            {githubInfo.lastCommit && (
                                <div className="pt-1 text-[11px] text-slate-500 border-t border-slate-200">
                                    <strong>Commit mới nhất:</strong> {githubInfo.lastCommit.message} ({dayjs(githubInfo.lastCommit.date).format('HH:mm DD/MM/YYYY')})
                                </div>
                            )}
                        </div>
                    )}

                    <Form.Item label="Ghi chú thêm">
                        <Input.TextArea
                            placeholder="Nhập ghi chú cho giảng viên nếu có..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </DashboardLayout>
    );
};

export default CourseDetail;
