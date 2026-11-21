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
    Collapse
} from 'antd';
import { 
    ArrowLeftOutlined, 
    UserOutlined, 
    CheckCircleFilled, 
    FileTextOutlined,
    EditOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

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
    const [submittingReview, setSubmittingReview] = useState(false);
    const [form] = Form.useForm();

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

    const studentTableData = classData.enrollments?.map((enrollment: any) => {
        const student = enrollment.student;
        // Find submissions for this student in the selected lesson
        const studentSubmissions = allSubmissions.filter(sub => 
            sub.studentId === student.id && 
            lessonHomeworks.some((hw: any) => hw.id === sub.homeworkId)
        );
        
        return {
            key: student.id,
            student,
            submissions: studentSubmissions,
            completedCount: studentSubmissions.length
        };
    }) || [];

    const columns = [
        {
            title: 'Học viên',
            key: 'student',
            render: (_: any, record: any) => (
                <div className="flex items-center gap-3">
                    <Avatar src={record.student.avatar} icon={<UserOutlined />} />
                    <div>
                        <div className="font-semibold text-slate-800">{record.student.fullName || record.student.username}</div>
                        <div className="text-xs text-slate-500">{record.student.email || `@${record.student.username}`}</div>
                    </div>
                </div>
            )
        },
        {
            title: 'Tiến độ buổi học',
            key: 'progress',
            width: 200,
            render: (_: any, record: any) => {
                const percent = totalHomeworks === 0 ? 0 : Math.round((record.completedCount / totalHomeworks) * 100);
                return (
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span>Đã nộp:</span>
                            <span className="font-medium">{record.completedCount} / {totalHomeworks} bài</span>
                        </div>
                        <Progress percent={percent} size="small" status={percent === 100 ? 'success' : 'active'} />
                    </div>
                );
            }
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 150,
            render: (_: any, record: any) => (
                <Button 
                    type={record.completedCount > 0 ? "primary" : "default"} 
                    disabled={totalHomeworks === 0}
                    onClick={() => {
                        setSelectedStudent(record.student);
                        // Populate form with existing feedback
                        const initialValues: any = {};
                        record.submissions.forEach((sub: any) => {
                            if (sub.status) initialValues[`status_${sub.homeworkId}`] = sub.status;
                            if (sub.teacherFeedback) initialValues[`feedback_${sub.homeworkId}`] = sub.teacherFeedback;
                        });
                        form.setFieldsValue(initialValues);
                        setGradingModalOpen(true);
                    }}
                >
                    {record.completedCount > 0 ? 'Chấm bài' : 'Xem chi tiết'}
                </Button>
            )
        }
    ];

    const getStatusTag = (sub: any) => {
        if (!sub) return <Tag color="default">Chưa nộp</Tag>;
        if (sub.status === 'GRADED') return <Tag color="success">Đã chấm</Tag>;
        if (sub.status === 'RETURNED') return <Tag color="warning">Trả bài</Tag>;
        if (sub.isLate) return <Tag color="orange">Nộp muộn</Tag>;
        return <Tag color="blue">Đã nộp</Tag>;
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
                            onClick={(e) => setSelectedLessonId(e.key)}
                            className="bg-transparent border-none"
                            items={courseData.lessons?.map((lesson: any, index: number) => ({
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
                                                            icon={<EditOutlined />}
                                                            onClick={() => handleReviewSubmit(hw.id, submission.id)}
                                                            loading={submittingReview}
                                                        >
                                                            Lưu kết quả bài này
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
        </DashboardLayout>
    );
};

export default ClassAssignments;
