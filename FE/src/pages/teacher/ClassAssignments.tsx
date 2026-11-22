import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
    Layout, 
    Typography, 
    Breadcrumb, 
    Menu, 
    Table, 
    Avatar, 
    Space, 
    Progress, 
    Button, 
    Drawer, 
    Form, 
    Input, 
    Radio, 
    message, 
    Tag,
    Spin,
    Card,
    Collapse,
    Alert,
    Tooltip
} from 'antd';
import { 
    ArrowLeftOutlined, 
    UserOutlined, 
    CheckCircleFilled, 
    CheckCircleOutlined,
    CloseCircleOutlined,
    ClockCircleOutlined,
    ExclamationCircleOutlined,
    SyncOutlined,
    FileTextOutlined,
    EditOutlined,
    RobotOutlined,
    GithubOutlined,
    InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { StudentDetailModal } from '@/components/student/StudentDetailModal';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

const sortLessons = (lessons: any[]) => {
    return [...(lessons || [])].sort((a: any, b: any) => {
        if (a.order !== undefined && b.order !== undefined && a.order !== b.order) {
            return a.order - b.order;
        }
        if (a.sessionNumber && b.sessionNumber && a.sessionNumber !== b.sessionNumber) {
            return a.sessionNumber - b.sessionNumber;
        }
        return (a.title || '').localeCompare(b.title || '', undefined, { numeric: true, sensitivity: 'base' });
    });
};

const ClassAssignments: React.FC = () => {
    const { id: classId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    
    // Data states
    const [loading, setLoading] = useState(true);
    const [classData, setClassData] = useState<any>(null);
    const [courseData, setCourseData] = useState<any>(null);
    const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
    
    // UI states
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
    
    // Modal states
    const [gradingModalOpen, setGradingModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [studentModalOpen, setStudentModalOpen] = useState(false);
    const [viewingStudent, setViewingStudent] = useState<any>(null);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [aiLoading, setAiLoading] = useState<{ [key: string]: boolean }>({});
    const [aiReviewMap, setAiReviewMap] = useState<{ [key: string]: any }>({});
    const [form] = Form.useForm();

    const handleGetAiReview = async (submissionId: string, hwId: string) => {
        setAiLoading(prev => ({ ...prev, [hwId]: true }));
        try {
            const res = await apiFetch<any>(`/upload/homework/submission/${submissionId}/ai-review`, {
                method: 'POST'
            });
            const data = res.data;
            setAiReviewMap(prev => ({ ...prev, [hwId]: data }));
            if (data.suggestedFeedback) {
                form.setFieldsValue({
                    [`feedback_${hwId}`]: data.suggestedFeedback,
                    [`status_${hwId}`]: data.suggestedStatus || 'GRADED',
                });
                message.success('Trợ lý AI đã phân tích và điền nhận xét đề xuất!');
            }
        } catch (err: any) {
            message.error(err?.message || 'Không thể lấy đánh giá AI');
        } finally {
            setAiLoading(prev => ({ ...prev, [hwId]: false }));
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch class details to get enrollments and courseId
            const classRes = await apiFetch<any>(`/classes/${classId}`);
            const fetchedClass = classRes.data;
            setClassData(fetchedClass);

            if (fetchedClass?.course?.id) {
                // Fetch course details to get lessons and homeworks
                const courseRes = await apiFetch<any>(`/courses/${fetchedClass.course.id}`);
                const courseInfo = courseRes.data;
                if (courseInfo?.lessons) {
                    courseInfo.lessons = sortLessons(courseInfo.lessons);
                }
                setCourseData(courseInfo);
                
                if (courseInfo?.lessons && courseInfo.lessons.length > 0) {
                    const searchParams = new URLSearchParams(location.search);
                    const queryLessonId = searchParams.get('lessonId');
                    
                    if (queryLessonId && courseInfo.lessons.some((l: any) => l.id === queryLessonId)) {
                        setSelectedLessonId(queryLessonId);
                    } else {
                        setSelectedLessonId(courseInfo.lessons[0].id);
                    }
                }
            }

            // Fetch all submissions for this class
            const subRes = await apiFetch<any>(`/upload/class/${classId}/submissions`);
            setAllSubmissions(subRes.data || []);
            
        } catch (error) {
            message.error("Lỗi khi tải dữ liệu bài tập lớp học");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (classId) fetchData();
    }, [classId]);

    // Lắng nghe sự thay đổi của query param ?lessonId=... để tự động chuyển tab
    useEffect(() => {
        if (!courseData?.lessons) return;
        
        const searchParams = new URLSearchParams(location.search);
        const queryLessonId = searchParams.get('lessonId');
        
        if (queryLessonId && courseData.lessons.some((l: any) => l.id === queryLessonId)) {
            setSelectedLessonId(queryLessonId);
        }
    }, [location.search, courseData]);

    const handleReviewSubmit = async (homeworkId: string, submissionId: string) => {
        try {
            const values = await form.validateFields([
                `status_${homeworkId}`, 
                `feedback_${homeworkId}`
            ]);
            
            setSubmittingReview(true);
            
            await apiFetch(`/upload/homework/submission/${submissionId}/review`, {
                method: 'POST',
                body: JSON.stringify({
                    status: values[`status_${homeworkId}`],
                    teacherFeedback: values[`feedback_${homeworkId}`]
                })
            });
            
            message.success('Đã lưu kết quả chấm bài');
            // Refresh submissions
            const subRes = await apiFetch<any>(`/upload/class/${classId}/submissions`);
            setAllSubmissions(subRes.data || []);
            
        } catch (error) {
            if (error.errorFields) return; // Validation error
            message.error(error.message || 'Lỗi khi chấm bài');
        } finally {
            setSubmittingReview(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Spin size="large" tip="Đang tải dữ liệu bài tập..." />
                </div>
            </DashboardLayout>
        );
    }

    if (!classData || !courseData) {
        return (
            <DashboardLayout>
                <div className="text-center py-20">
                    <Text type="secondary">Không tìm thấy thông tin lớp học hoặc khóa học</Text>
                    <div className="mt-4">
                        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Quay lại</Button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    // Prepare data for main table
    const selectedLesson = courseData.lessons?.find((l: any) => l.id === selectedLessonId);
    const lessonHomeworks = selectedLesson?.homeworks || [];
    const totalHomeworks = lessonHomeworks.length;

    // Deduplicate students from enrollments and compute grading status
    const studentMap = new Map<string, any>();
    classData.enrollments?.forEach((enrollment: any) => {
        const student = enrollment.student;
        if (!student?.id || studentMap.has(student.id)) return;

        const studentSubmissions = allSubmissions.filter(sub => 
            sub.studentId === student.id && 
            lessonHomeworks.some((hw: any) => hw.id === sub.homeworkId)
        );

        const gradedSubmissions = studentSubmissions.filter(sub => 
            sub.status === 'GRADED' || sub.status === 'RETURNED'
        );
        const gradedCount = gradedSubmissions.length;
        const hasReturned = studentSubmissions.some(sub => sub.status === 'RETURNED');
        const latestReviewDate = gradedSubmissions.map(s => s.reviewedAt).filter(Boolean).sort().pop();
        const isFullyGraded = totalHomeworks > 0 && studentSubmissions.length >= totalHomeworks && gradedCount >= totalHomeworks;
        const isPartiallyGraded = gradedCount > 0 && !isFullyGraded;

        studentMap.set(student.id, {
            key: student.id,
            student,
            submissions: studentSubmissions,
            completedCount: studentSubmissions.length,
            gradedCount,
            isFullyGraded,
            isPartiallyGraded,
            hasReturned,
            latestReviewDate
        });
    });
    const studentTableData = Array.from(studentMap.values());

    const columns = [
        {
            title: 'Học viên',
            key: 'student',
            render: (_: any, record: any) => (
                <div 
                    className="flex items-center gap-3 cursor-pointer group p-1.5 -m-1.5 rounded-lg hover:bg-blue-50/70 transition-all select-none"
                    onClick={() => {
                        setViewingStudent(record.student);
                        setStudentModalOpen(true);
                    }}
                    title="Nhấn để xem thông tin chi tiết và tiến độ học viên"
                >
                    <Avatar 
                        src={record.student.avatar} 
                        icon={<UserOutlined />} 
                        className="group-hover:ring-2 ring-blue-500 transition-all shrink-0" 
                    />
                    <div>
                        <div className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                            {record.student.fullName || record.student.username}
                            <InfoCircleOutlined className="text-xs text-blue-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-xs text-slate-500">{record.student.email || `@${record.student.username}`}</div>
                    </div>
                </div>
            )
        },
        {
            title: 'Tiến độ buổi học',
            key: 'progress',
            width: 180,
            render: (_: any, record: any) => {
                const percent = totalHomeworks === 0 ? 0 : Math.round((record.completedCount / totalHomeworks) * 100);
                return (
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500">Đã nộp:</span>
                            <span className="font-semibold text-slate-700">{record.completedCount} / {totalHomeworks} bài</span>
                        </div>
                        <Progress percent={percent} size="small" status={percent === 100 ? 'success' : 'active'} />
                    </div>
                );
            }
        },
        {
            title: 'Trạng thái chấm',
            key: 'gradingStatus',
            width: 180,
            render: (_: any, record: any) => {
                if (totalHomeworks === 0) {
                    return <Tag color="default">Không có bài tập</Tag>;
                }
                if (record.completedCount === 0) {
                    return <Tag color="default">Chưa nộp bài</Tag>;
                }
                if (record.isFullyGraded) {
                    if (record.hasReturned) {
                        return (
                            <div className="space-y-1">
                                <Tag color="warning" className="flex items-center gap-1 w-fit font-medium m-0">
                                    <CloseCircleOutlined /> Đã chấm: Cần sửa
                                </Tag>
                                {record.latestReviewDate && (
                                    <div className="text-[11px] text-slate-400">
                                        {dayjs(record.latestReviewDate).format('HH:mm DD/MM')}
                                    </div>
                                )}
                            </div>
                        );
                    }
                    return (
                        <div className="space-y-1">
                            <Tag color="success" className="flex items-center gap-1 w-fit font-semibold m-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                                <CheckCircleFilled className="text-emerald-500" /> Đã chấm đạt
                            </Tag>
                            {record.latestReviewDate && (
                                <div className="text-[11px] text-slate-400">
                                    Lúc {dayjs(record.latestReviewDate).format('HH:mm DD/MM')}
                                </div>
                            )}
                        </div>
                    );
                }
                if (record.gradedCount > 0) {
                    return (
                        <Tag color="processing" className="font-medium m-0">
                            Đã chấm {record.gradedCount}/{record.completedCount} bài
                        </Tag>
                    );
                }
                return (
                    <Tag color="error" className="flex items-center gap-1 w-fit font-semibold m-0 bg-red-50 text-red-600 border-red-200">
                        <ClockCircleOutlined /> Chưa chấm ({record.completedCount} bài)
                    </Tag>
                );
            }
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 150,
            render: (_: any, record: any) => {
                const openGrading = () => {
                    setSelectedStudent(record.student);
                    const initialValues: any = {};
                    record.submissions.forEach((sub: any) => {
                        if (sub.status) initialValues[`status_${sub.homeworkId}`] = sub.status;
                        if (sub.teacherFeedback) initialValues[`feedback_${sub.homeworkId}`] = sub.teacherFeedback;
                    });
                    form.setFieldsValue(initialValues);
                    setGradingModalOpen(true);
                };

                if (record.completedCount === 0 || totalHomeworks === 0) {
                    return (
                        <Button 
                            type="default" 
                            disabled={totalHomeworks === 0}
                            onClick={openGrading}
                        >
                            Xem chi tiết
                        </Button>
                    );
                }

                if (record.isFullyGraded) {
                    return (
                        <Tooltip title="Bài làm đã được chấm. Nhấn vào đây để xem lại hoặc điều chỉnh kết quả chấm nếu cần.">
                            <Button 
                                type="default"
                                icon={<EditOutlined className="text-emerald-600" />}
                                className="border-emerald-500 text-emerald-700 hover:text-emerald-800 hover:border-emerald-600 bg-emerald-50/40 hover:bg-emerald-50 font-medium"
                                onClick={openGrading}
                            >
                                Chấm lại
                            </Button>
                        </Tooltip>
                    );
                }

                if (record.isPartiallyGraded) {
                    return (
                        <Button 
                            type="primary"
                            icon={<EditOutlined />}
                            className="bg-amber-600 hover:bg-amber-700 font-medium"
                            onClick={openGrading}
                        >
                            Chấm tiếp
                        </Button>
                    );
                }

                return (
                    <Button 
                        type="primary" 
                        icon={<EditOutlined />}
                        className="bg-blue-600 hover:bg-blue-700 font-medium shadow-sm"
                        onClick={openGrading}
                    >
                        Chấm bài
                    </Button>
                );
            }
        }
    ];

    const getStatusTag = (sub: any) => {
        if (!sub) return <Tag color="default">Chưa nộp</Tag>;
        if (sub.status === 'GRADED') return <Tag color="success" icon={<CheckCircleFilled />}>Đã chấm: Đạt</Tag>;
        if (sub.status === 'RETURNED') return <Tag color="warning" icon={<CloseCircleOutlined />}>Đã chấm: Trả bài</Tag>;
        if (sub.isLate) return <Tag color="orange">Nộp muộn</Tag>;
        return <Tag color="blue" icon={<ClockCircleOutlined />}>Đã nộp (Chờ chấm)</Tag>;
    };

    return (
        <DashboardLayout>
            <div className="space-y-4 h-full flex flex-col">
                <Breadcrumb items={[
                    { title: 'Quản lý Lớp học', onClick: () => navigate(user?.role === 'STAFF' ? '/staff/classes' : '/teacher/classes'), className: 'cursor-pointer' },
                    { title: classData.title, onClick: () => navigate(user?.role === 'STAFF' ? `/staff/class/${classId}` : `/admin/class/${classId}`), className: 'cursor-pointer' },
                    { title: 'Chấm bài tập' }
                ]} />
                
                <div className="flex items-center gap-4">
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
                    <Title level={3} className="m-0">Chấm bài: {classData.title}</Title>
                </div>

                <Layout className="bg-transparent mt-4 border border-slate-200 rounded-xl overflow-hidden flex-1 min-h-[600px]">
                    <Sider width={280} className="bg-slate-50 border-r border-slate-200 overflow-y-auto">
                        <div className="p-4 border-b border-slate-200 font-semibold text-slate-700 sticky top-0 bg-slate-50 z-10">
                            Danh sách Buổi học
                        </div>
                        <Menu
                            mode="inline"
                            selectedKeys={selectedLessonId ? [selectedLessonId] : []}
                            onClick={(e) => {
                                setSelectedLessonId(e.key);
                                navigate(`/teacher/class/${classId}/assignments?lessonId=${e.key}`, { replace: true });
                            }}
                            className="bg-transparent border-none"
                            items={sortLessons(courseData.lessons)?.map((lesson: any) => ({
                                key: lesson.id,
                                label: (
                                    <div className="flex justify-between items-center w-full pr-2">
                                        <span className="truncate">{lesson.title}</span>
                                        {lesson.homeworks?.length > 0 && (
                                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                                {lesson.homeworks.length} BT
                                            </span>
                                        )}
                                    </div>
                                ),
                                icon: <FileTextOutlined />
                            }))}
                        />
                    </Sider>
                    <Content className="bg-white p-6 overflow-y-auto">
                        {selectedLesson ? (
                            <div className="space-y-6">
                                <div>
                                    <Title level={4} className="mb-1">{selectedLesson.title}</Title>
                                    <Text type="secondary">Tổng số bài tập: {totalHomeworks}</Text>
                                </div>
                                
                                {totalHomeworks === 0 ? (
                                    <div className="text-center py-10 bg-slate-50 rounded-lg border border-slate-100">
                                        <Text type="secondary">Buổi học này không có bài tập về nhà.</Text>
                                    </div>
                                ) : (
                                    <Table 
                                        columns={columns} 
                                        dataSource={studentTableData} 
                                        pagination={false}
                                        className="border border-slate-100 rounded-lg"
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                Vui lòng chọn một buổi học bên trái
                            </div>
                        )}
                    </Content>
                </Layout>
            </div>

            {/* Grading Drawer */}
            <Drawer
                title={`Chấm bài - ${selectedStudent?.fullName || selectedStudent?.username}`}
                open={gradingModalOpen}
                onClose={() => setGradingModalOpen(false)}
                width={800}
                placement="right"
                bodyStyle={{ padding: '24px' }}
            >
                {selectedLesson && selectedStudent && (
                    <Form form={form} layout="vertical">
                        {(() => {
                            const currentStudentData = studentTableData.find(s => s.student?.id === selectedStudent?.id);
                            if (currentStudentData?.isFullyGraded) {
                                return (
                                    <Alert
                                        type="success"
                                        showIcon
                                        className="mb-4 rounded-xl border-emerald-200 bg-emerald-50/70"
                                        message={<span className="font-semibold text-emerald-900">Bài tập của học viên này đã được chấm</span>}
                                        description={
                                            <span className="text-xs text-emerald-700">
                                                Học viên đã được đánh giá đạt hoàn thành. Bạn hoàn toàn có thể thay đổi nhận xét hoặc kết quả đánh giá bên dưới và bấm <strong>"Lưu lại kết quả (Chấm lại)"</strong> để cập nhật lại.
                                            </span>
                                        }
                                    />
                                );
                            }
                            if (currentStudentData?.hasReturned) {
                                return (
                                    <Alert
                                        type="warning"
                                        showIcon
                                        className="mb-4 rounded-xl border-amber-200 bg-amber-50/70"
                                        message={<span className="font-semibold text-amber-900">Bài tập đang ở trạng thái Trả bài / Cần sửa lại</span>}
                                        description={
                                            <span className="text-xs text-amber-700">
                                                Bạn có thể cập nhật lại nhận xét hoặc chuyển sang "Đạt (Hoàn thành)" khi học viên đã bổ sung đầy đủ.
                                            </span>
                                        }
                                    />
                                );
                            }
                            return null;
                        })()}
                        <Collapse 
                            defaultActiveKey={lessonHomeworks[0] ? [lessonHomeworks[0].id] : []}
                            className="bg-white"
                            items={lessonHomeworks.map((hw: any, index: number) => {
                                const submission = allSubmissions.find(sub => sub.homeworkId === hw.id && sub.studentId === selectedStudent.id);
                                const isSubmitted = !!submission;
                                
                                return {
                                    key: hw.id,
                                    label: <div className="flex items-center gap-2"><Text strong>{index + 1}. {hw.title}</Text> {getStatusTag(submission)}</div>,
                                    children: (
                                        <div className={`pl-2 border-l-4 ${isSubmitted ? 'border-l-primary' : 'border-l-slate-300'}`}>
                                            <div className="bg-slate-50 p-3 rounded mb-4 text-sm" dangerouslySetInnerHTML={{ __html: hw.description }} />
                                            
                                            {!isSubmitted ? (
                                                <div className="text-slate-400 italic">Học viên chưa nộp bài tập này.</div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                                        <div>
                                                            <Text type="secondary">Link bài làm:</Text><br />
                                                            <a href={submission.githubLink} target="_blank" rel="noreferrer" className="font-medium text-primary break-all">
                                                                {submission.githubLink}
                                                            </a>
                                                        </div>
                                                        <div>
                                                            <Text type="secondary">Ghi chú của học viên:</Text><br />
                                                            <Text className="italic">{submission.note || 'Không có ghi chú'}</Text>
                                                        </div>
                                                        <div>
                                                            <Text type="secondary">Thời gian nộp:</Text><br />
                                                            <Text>{dayjs(submission.submittedAt).format('HH:mm DD/MM/YYYY')}</Text>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-purple-50 to-indigo-50 p-3 rounded-xl border border-purple-100">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-base">
                                                                <RobotOutlined />
                                                            </span>
                                                            <div>
                                                                <div className="font-semibold text-purple-900 text-sm">Trợ lý AI Đánh giá Bài tập</div>
                                                                <div className="text-xs text-purple-600">Tự động phân tích GitHub & gợi ý nhận xét mẫu cho giảng viên</div>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            type="primary"
                                                            size="small"
                                                            icon={<RobotOutlined />}
                                                            loading={aiLoading[hw.id]}
                                                            onClick={() => handleGetAiReview(submission.id, hw.id)}
                                                            className="bg-purple-600 hover:bg-purple-700 border-none font-medium shadow-sm"
                                                        >
                                                            Gợi ý nhận xét AI
                                                        </Button>
                                                    </div>

                                                    {aiReviewMap[hw.id] && (
                                                        <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-100 text-xs space-y-2 animate-fade-in">
                                                            <div className="font-semibold text-purple-900">{aiReviewMap[hw.id].summary}</div>
                                                            {aiReviewMap[hw.id].strengths && (
                                                                <div>
                                                                    <strong className="text-emerald-700 block mb-0.5">✅ Điểm tốt:</strong>
                                                                    <ul className="list-disc pl-4 space-y-0.5 text-slate-700 m-0">
                                                                        {aiReviewMap[hw.id].strengths.map((s: string, idx: number) => (
                                                                            <li key={idx}>{s}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            {aiReviewMap[hw.id].improvements && (
                                                                <div>
                                                                    <strong className="text-amber-700 block mb-0.5">💡 Điểm cần cải thiện:</strong>
                                                                    <ul className="list-disc pl-4 space-y-0.5 text-slate-700 m-0">
                                                                        {aiReviewMap[hw.id].improvements.map((im: string, idx: number) => (
                                                                            <li key={idx}>{im}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="border-t border-slate-100 pt-4 mt-2">
                                                        <Form.Item 
                                                            name={`status_${hw.id}`} 
                                                            label={<Text strong>Kết quả chấm</Text>}
                                                            rules={[{ required: true, message: 'Vui lòng chọn kết quả' }]}
                                                            className="mb-3"
                                                        >
                                                            <Radio.Group>
                                                                <Radio value="GRADED" className="text-success font-medium">Đạt (Hoàn thành)</Radio>
                                                                <Radio value="RETURNED" className="text-warning font-medium">Không đạt (Yêu cầu làm lại)</Radio>
                                                            </Radio.Group>
                                                        </Form.Item>
                                                        
                                                        <Form.Item 
                                                            name={`feedback_${hw.id}`} 
                                                            label={<Text strong>Nhận xét của giảng viên</Text>}
                                                            className="mb-3"
                                                        >
                                                            <Input.TextArea rows={3} placeholder="Nhập nhận xét chi tiết cho bài làm này..." />
                                                        </Form.Item>
                                                        
                                                        <Button 
                                                            type="primary" 
                                                            icon={submission.status ? <CheckCircleFilled /> : <EditOutlined />}
                                                            className={submission.status ? "bg-emerald-600 hover:bg-emerald-700 font-medium" : "font-medium"}
                                                            onClick={() => handleReviewSubmit(hw.id, submission.id)}
                                                            loading={submittingReview}
                                                        >
                                                            {submission.status ? 'Lưu lại kết quả (Chấm lại)' : 'Lưu kết quả bài này'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                };
                            })}
                        />
                    </Form>
                )}
            </Drawer>

            <StudentDetailModal
                open={studentModalOpen}
                onClose={() => setStudentModalOpen(false)}
                studentId={viewingStudent?.id}
                initialStudent={viewingStudent}
                classId={classId}
                className={classData?.title}
            />
        </DashboardLayout>
    );
};

export default ClassAssignments;
