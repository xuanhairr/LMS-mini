import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card,
    Descriptions,
    Tag,
    Button,
    Table,
    Space,
    Typography,
    Avatar,
    Row,
    Col,
    Spin,
    message,
    Breadcrumb,
    Statistic,
    Divider,
    Modal,
    Select,
    Form,
    Input,
    DatePicker,
    Progress,
    Tabs,
    Drawer,
    notification
} from 'antd';
import {
    ArrowLeftOutlined,
    TeamOutlined,
    BookOutlined,
    UserOutlined,
    CalendarOutlined,
    ClockCircleOutlined,
    EditOutlined,
    PlusOutlined,
    DeleteOutlined,
    LineChartOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    MinusCircleOutlined,
    PlayCircleOutlined,
    FileTextOutlined,
    DownloadOutlined,
    TrophyOutlined,
    InfoCircleOutlined,
    EyeOutlined,
    SearchOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { CLASS_STATUS_CONFIG } from '@/lib/constants';
import { useSystemConstants, getStatusConfig } from '@/contexts/SystemContext';
import { AttendanceReportTab } from './components/AttendanceReportTab';
import { GradingPanel } from '@/components/grading/GradingPanel';
import { StudentDetailModal } from '@/components/student/StudentDetailModal';
import { QuickAttendanceDrawer } from '@/components/attendance/QuickAttendanceDrawer';

const { Title, Text } = Typography;

const StudentProgressBar: React.FC<{ classId: string, studentId: string }> = ({ classId, studentId }) => {
    const [percent, setPercent] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch<any>(`/classes/${classId}/progress/${studentId}`).then(res => {
            if (res.data && res.data.summary) {
                setPercent(res.data.summary.progressPercent || 0);
            }
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [classId, studentId]);

    if (loading) return <Spin size="small" />;
    return <Progress percent={percent} size="small" />;
};

interface ClassDetailData {
    id: string;
    title: string;
    status: string;
    startDate?: string;
    endDate?: string;
    courseId?: string; // Changed to match schema/API
    course?: {
        id: string;
        title: string;
        description: string;
        coverImage?: string;
    };
    teacher?: {
        id: string;
        username: string;
        fullName?: string;
    };
    enrollments?: Array<{
        id: string;
        createdAt: string;
        student: {
            id: string;
            username: string;
            fullName?: string;
            email?: string;
        };
    }>;
    manager?: {
        id: string;
        username: string;
        fullName?: string;
    };
}

interface StudentOption {
    id: string;
    username: string;
    fullName?: string;
}

const ClassDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [classData, setClassData] = useState<ClassDetailData | null>(null);
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [availableStudents, setAvailableStudents] = useState<StudentOption[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const { user } = useAuth();
    const { classStatuses } = useSystemConstants();
    const isAdminOrStaff = (user?.roles && user.roles.some((r: string) => ['ADMIN', 'STAFF', 'HEAD_STAFF'].includes(r))) || ['ADMIN', 'STAFF', 'HEAD_STAFF'].includes(user?.role as string);

    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [selectedStudentForProgress, setSelectedStudentForProgress] = useState<any>(null);
    const [progressData, setProgressData] = useState<any>(null);
    const [progressLoading, setProgressLoading] = useState(false);
    const [studentDetailOpen, setStudentDetailOpen] = useState(false);
    const [viewingStudent, setViewingStudent] = useState<any>(null);
    const [attendanceDrawerVisible, setAttendanceDrawerVisible] = useState(false);

    const handleViewProgress = async (record: any) => {
        setSelectedStudentForProgress(record);
        setIsProgressModalOpen(true);
        setProgressLoading(true);
        try {
            const res = await apiFetch<any>(`/classes/${id}/progress/${record.student?.id}`);
            setProgressData(res.data);
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu tiến độ:', error);
            message.error('Không thể lấy chi tiết tiến độ học tập');
        } finally {
            setProgressLoading(false);
        }
    };

    const handleExportStudents = () => {
        if (!classData || !classData.enrollments) return;
        const data = classData.enrollments.map((e, index) => ({
            'STT': index + 1,
            'Họ tên': e.student?.fullName || e.student?.username || 'N/A',
            'Tài khoản': e.student?.username || 'N/A',
            'Email': e.student?.email || 'N/A',
            'Ngày tham gia': e.createdAt ? dayjs(e.createdAt).format('DD/MM/YYYY') : 'N/A'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 25 }, { wch: 30 }, { wch: 15 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Danh_sach_hoc_vien");
        XLSX.writeFile(wb, `Danh_sach_hoc_vien_${classData.title}.xlsx`);
    };



    // Edit Class states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [courses, setCourses] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [managers, setManagers] = useState<any[]>([]);
    const [courseSearchLoading, setCourseSearchLoading] = useState(false);
    const [teacherSearchLoading, setTeacherSearchLoading] = useState(false);
    const [managerSearchLoading, setManagerSearchLoading] = useState(false);
    const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const fetchCourses = async (title?: string) => {
        setCourseSearchLoading(true);
        try {
            const query = title
                ? `/courses?where[status][equals]=active&where[title][contains]=${title}&take=20`
                : `/courses?where[status][equals]=active&take=20`;
            const res = await apiFetch<any[]>(query);
            setCourses(res.data || []);
        } catch (error) { console.error(error); }
        finally { setCourseSearchLoading(false); }
    };

    const fetchTeachers = async (username?: string) => {
        setTeacherSearchLoading(true);
        try {
            if (username) {
                const [resUsername, resFullName] = await Promise.all([
                    apiFetch<any>(`/users?where[roles][has]=TEACHER&where[username][contains]=${username}&take=20`),
                    apiFetch<any>(`/users?where[roles][has]=TEACHER&where[fullName][contains]=${username}&take=20`)
                ]);
                const listUsername = resUsername.data?.items || (Array.isArray(resUsername.data) ? resUsername.data : []);
                const listFullName = resFullName.data?.items || (Array.isArray(resFullName.data) ? resFullName.data : []);
                
                const merged = [...listUsername];
                listFullName.forEach((item: any) => {
                    if (!merged.some(existing => existing.id === item.id)) {
                        merged.push(item);
                    }
                });
                setTeachers(merged);
            } else {
                const res = await apiFetch<any>(`/users?where[roles][has]=TEACHER&take=20`);
                setTeachers(res.data?.items || (Array.isArray(res.data) ? res.data : []));
            }
        } catch (error) { console.error(error); }
        finally { setTeacherSearchLoading(false); }
    };

    const fetchManagers = async (username?: string) => {
        setManagerSearchLoading(true);
        try {
            if (username) {
                const [resUsername, resFullName] = await Promise.all([
                    apiFetch<any>(`/users?where[roles][has]=STAFF&where[username][contains]=${username}&take=20`),
                    apiFetch<any>(`/users?where[roles][has]=STAFF&where[fullName][contains]=${username}&take=20`)
                ]);
                const listUsername = resUsername.data?.items || (Array.isArray(resUsername.data) ? resUsername.data : []);
                const listFullName = resFullName.data?.items || (Array.isArray(resFullName.data) ? resFullName.data : []);
                
                const merged = [...listUsername];
                listFullName.forEach((item: any) => {
                    if (!merged.some(existing => existing.id === item.id)) {
                        merged.push(item);
                    }
                });
                setManagers(merged);
            } else {
                const res = await apiFetch<any>(`/users?where[roles][has]=STAFF&take=20`);
                setManagers(res.data?.items || (Array.isArray(res.data) ? res.data : []));
            }
        } catch (error) { console.error(error); }
        finally { setManagerSearchLoading(false); }
    };

    const handleSearchDebounced = (value: string, type: 'course' | 'teacher' | 'manager') => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            if (type === 'course') fetchCourses(value);
            if (type === 'teacher') fetchTeachers(value);
            if (type === 'manager') fetchManagers(value);
        }, 500);
    };

    const handleOpenEdit = () => {
        if (!classData) return;
        form.setFieldsValue({
            ...classData,
            dates: classData.startDate && classData.endDate ? [dayjs(classData.startDate), dayjs(classData.endDate)] : null,
            teacherId: classData.teacher?.id,
            managerId: classData.manager?.id,
            courseId: classData.course?.id
        });
        if (classData.course) setCourses([classData.course]);
        if (classData.teacher) setTeachers([classData.teacher]);
        if (classData.manager) setManagers([classData.manager]);
        setIsEditModalOpen(true);
        fetchCourses("");
        fetchTeachers("");
        fetchManagers("");
    };

    const handleEditSave = async () => {
        try {
            const values = await form.validateFields();
            const payload = {
                title: values.title,
                course: { id: values.courseId },
                teacher: { id: values.teacherId },
                manager: values.managerId ? { id: values.managerId } : undefined,
                status: values.status,
                startDate: values.dates?.[0]?.toISOString(),
                endDate: values.dates?.[1]?.toISOString(),
            };
            const res = await apiFetch<any>(`/classes/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(payload),
            });
            message.success(res.message || 'Cập nhật lớp học thành công!');
            setIsEditModalOpen(false);
            fetchClassData();
        } catch (error) {
            message.error('Lỗi khi cập nhật lớp học');
        }
    };

    const fetchClassData = async () => {
        setLoading(true);
        try {
            const res = await apiFetch<ClassDetailData>(`/classes/${id}`);
            setClassData(res.data);
        } catch (error) {
            message.error('Không thể tải thông tin chi tiết lớp học');
        } finally {
            setLoading(false);
        }
    };

    const searchStudents = async (query: string) => {
        if (!query) return;
        setSearchLoading(true);
        try {
            // Simple search by username or name
            const res = await apiFetch<StudentOption[]>(`/users?where[roles][has]=STUDENT&where[username][contains]=${query}`);
            setAvailableStudents(res.data || []);
        } catch (error) {
            message.error('Lỗi khi tìm kiếm học viên');
        } finally {
            setSearchLoading(false);
        }
    };

    const handleEnroll = async () => {
        if (!selectedStudentIds || selectedStudentIds.length === 0 || !classData) return;

        try {
            setLoading(true);
            const res = await apiFetch<any>(`/classes/${classData.id}/enroll-bulk`, {
                method: 'POST',
                body: JSON.stringify({ userIds: selectedStudentIds }),
            });
            const count = res.data?.count ?? selectedStudentIds.length;
            message.success(`Đã ghi danh ${count} học viên vào lớp thành công!`);
            setIsEnrollModalOpen(false);
            setSelectedStudentIds([]);
            fetchClassData(); // Refresh list
        } catch (error: any) {
            const errorMsg = error?.message || 'Lỗi khi ghi danh học viên (Dữ liệu không hợp lệ hoặc lỗi hệ thống)';
            notification.error({
                message: 'Không thể thêm học viên vào lớp',
                description: errorMsg,
                duration: 6,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchClassData();
    }, [id]);

    const { RangePicker } = DatePicker;

    if (loading && !classData) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Spin size="large" tip="Đang tải thông tin lớp học..." />
                </div>
            </DashboardLayout>
        );
    }

    if (!classData) {
        return (
            <DashboardLayout>
                <div className="text-center py-20">
                    <Text type="secondary">Không tìm thấy thông tin lớp học</Text>
                    <div className="mt-4">
                        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
                            Quay lại danh sách
                        </Button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const studentColumns = [
        {
            title: 'Học viên',
            dataIndex: ['student', 'username'],
            key: 'username',
            render: (text: string, record: any) => (
                <div 
                    className="flex items-center gap-2 cursor-pointer group p-1 -m-1 rounded-lg hover:bg-blue-50/70 transition-all select-none"
                    onClick={() => {
                        setViewingStudent(record.student);
                        setStudentDetailOpen(true);
                    }}
                    title="Nhấn để xem thông tin chi tiết và tiến độ học viên"
                >
                    <Avatar icon={<UserOutlined />} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${text}`} className="group-hover:ring-2 ring-blue-500 transition-all shrink-0" />
                    <div>
                        <div className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                            {record.student?.fullName || text}
                            <InfoCircleOutlined className="text-xs text-blue-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {(record.student?.fullName || text) !== text && (
                            <div className="text-xs text-muted-foreground">{text}</div>
                        )}
                    </div>
                </div>
            )
        },
        {
            title: 'Email',
            dataIndex: ['student', 'email'],
            key: 'email',
            render: (email: string) => email || 'N/A'
        },
        {
            title: 'Ngày tham gia',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => dayjs(date).format('DD/MM/YYYY')
        },
        {
            title: 'Tiến độ',
            key: 'progress',
            width: 150,
            render: (_: any, record: any) => (
                id && record.student?.id ? <StudentProgressBar classId={id} studentId={record.student.id} /> : '-'
            )
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_: any, record: any) => (
                <Space>
                    <Button
                        type="default"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => {
                            setViewingStudent(record.student);
                            setStudentDetailOpen(true);
                        }}
                    >
                        Hồ sơ
                    </Button>
                    {!isAdminOrStaff && (
                        <Button
                            type="primary"
                            ghost
                            size="small"
                            icon={<LineChartOutlined />}
                            onClick={() => handleViewProgress(record)}
                        >
                            Tiến độ
                        </Button>
                    )}
                    {isAdminOrStaff && (
                        <Button
                            danger
                            type="text"
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => {
                                Modal.confirm({
                                    title: 'Xóa ghi danh',
                                    content: 'Bạn có chắc chắn muốn xóa học viên này khỏi lớp?',
                                    onOk: async () => {
                                        try {
                                            const res = await apiFetch<any>(`/enrollments/${record.id}`, { method: 'DELETE' });
                                            message.success(res.message || 'Đã xóa ghi danh');
                                            fetchClassData();
                                        } catch (error) {
                                            message.error('Lỗi khi xóa ghi danh');
                                        }
                                    }
                                });
                            }}
                        />
                    )}
                </Space>
            )
        }
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                {/* Header & Breadcrumb */}
                <div className="flex flex-col gap-4">
                    <Breadcrumb items={[
                        { title: 'Trang chủ', onClick: () => navigate('/dashboard'), className: 'cursor-pointer' },
                        { title: 'Quản lý Lớp học', onClick: () => navigate(user?.role === 'STAFF' ? '/staff/classes' : (isAdminOrStaff ? '/admin/classes' : '/teacher/classes')), className: 'cursor-pointer' },
                        { title: classData.title }
                    ]} />

                    <div className="flex justify-between items-start">
                        <div className="flex gap-4 items-center">
                            <Button
                                icon={<ArrowLeftOutlined />}
                                onClick={() => navigate(-1)}
                                className="hover:scale-105 transition-transform"
                            />
                            <div>
                                <Title level={2} className="m-0">{classData.title}</Title>
                                <Space className="mt-1">
                                    <Tag color={CLASS_STATUS_CONFIG[classData.status]?.color || 'default'} className="rounded-full px-3">
                                        {CLASS_STATUS_CONFIG[classData.status]?.label || 'Không xác định'}
                                    </Tag>
                                    <Text type="secondary" className="flex items-center gap-1">
                                        <ClockCircleOutlined /> Lớp học ID: {classData.id.slice(-8)}
                                    </Text>
                                </Space>
                            </div>
                        </div>
                        <Space>
                            <Button
                                type="primary"
                                icon={<CheckCircleOutlined />}
                                onClick={() => setAttendanceDrawerVisible(true)}
                                className="bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm font-medium"
                            >
                                Điểm danh buổi học
                            </Button>
                            {isAdminOrStaff && (
                                <>
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={() => setIsEnrollModalOpen(true)}
                                    >
                                        Ghi danh học viên
                                    </Button>
                                    <Button
                                        icon={<EditOutlined />}
                                        className="rounded-lg"
                                        onClick={handleOpenEdit}
                                    >
                                        Chỉnh sửa lớp
                                    </Button>
                                </>
                            )}
                        </Space>
                    </div>
                </div>

                <Row gutter={[24, 24]}>
                    {/* Main Content */}
                    <Col xs={24} lg={isAdminOrStaff ? 16 : 24} className="space-y-6">
                        {/* Statistics Card */}
                        <Card className="border-0 shadow-soft overflow-hidden">
                            <Row gutter={24} align="middle">
                                <Col span={8} className="text-center border-r border-gray-100">
                                    <Statistic
                                        title="Tổng học viên"
                                        value={classData.enrollments?.length || 0}
                                        prefix={<TeamOutlined className="text-primary opacity-50" />}
                                    />
                                </Col>
                                <Col span={8} className="text-center border-r border-gray-100">
                                    <Statistic
                                        title="Thời gian bắt đầu"
                                        value={classData.startDate ? dayjs(classData.startDate).format('DD/MM/YYYY') : 'Chưa set'}
                                        prefix={<CalendarOutlined className="text-primary opacity-50" />}
                                    />
                                </Col>
                                <Col span={8} className="text-center">
                                    <Statistic
                                        title="Dự kiến kết thúc"
                                        value={classData.endDate ? dayjs(classData.endDate).format('DD/MM/YYYY') : 'Chưa set'}
                                        prefix={<CalendarOutlined className="text-primary opacity-50" />}
                                    />
                                </Col>
                            </Row>
                        </Card>

                        {/* Student List & Attendance Tabs */}
                        <Tabs
                            defaultActiveKey="students"
                            className="bg-white rounded-xl shadow-soft p-4"
                            items={[
                                {
                                    key: 'students',
                                    label: <Space><TeamOutlined /> Danh sách học viên</Space>,
                                    children: (
                                        <div className="space-y-4">
                                            <div className="flex justify-end gap-2 mb-4">
                                                <Button icon={<DownloadOutlined />} onClick={handleExportStudents}>
                                                    Xuất Danh sách
                                                </Button>

                                            </div>
                                            <Table
                                                loading={loading}
                                                columns={studentColumns}
                                                dataSource={classData.enrollments}
                                                rowKey="id"
                                                pagination={{ pageSize: 10 }}
                                                scroll={{ x: 600 }}
                                            />
                                        </div>
                                    )
                                },
                                {
                                    key: 'attendance',
                                    label: <Space><CalendarOutlined /> Báo cáo điểm danh</Space>,
                                    children: (
                                        <AttendanceReportTab 
                                            classId={id!} 
                                            classData={classData} 
                                            onOpenAttendance={() => setAttendanceDrawerVisible(true)}
                                        />
                                    )
                                },
                                {
                                    key: 'grading',
                                    label: <Space><TrophyOutlined /> Bảng điểm</Space>,
                                    children: (
                                        <GradingPanel
                                            classId={id!}
                                            courseId={classData.courseId || ''}
                                            className={classData.title}
                                        />
                                    )
                                }
                            ]}
                        />
                    </Col>

                    {/* Sidebar */}
                    {isAdminOrStaff && (
                        <Col xs={24} lg={8} className="space-y-6">
                            {/* Course Info Card */}
                            <Card
                                title={<Space><BookOutlined /> Khóa học chủ quản</Space>}
                                className="border-0 shadow-soft"
                                cover={
                                    <div className="h-32 bg-gray-50 flex items-center justify-center border-b border-gray-100 overflow-hidden">
                                        {classData.course?.coverImage ? (
                                            <img src={classData.course.coverImage} alt="Course" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-4xl opacity-20">📚</div>
                                        )}
                                    </div>
                                }
                            >
                                <Title level={5} className="mt-0">{classData.course?.title}</Title>
                                <Text type="secondary" className="line-clamp-3 mb-4 block">
                                    {classData.course?.description || 'Không có mô tả chi tiết cho khóa học này.'}
                                </Text>
                                <Button block ghost type="primary" onClick={() => navigate(`/student/course/${classData.course?.id}`)}>Xem giáo trình</Button>
                            </Card>

                            {/* Instructor Card */}
                            <Card
                                title={<Space><UserOutlined /> Giảng viên đứng lớp</Space>}
                                className="border-0 shadow-soft"
                            >
                                <div className="flex items-center gap-4">
                                    <Avatar size={64} icon={<UserOutlined />} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${classData.teacher?.username}`} />
                                    <div>
                                        <div className="font-bold text-lg">{classData.teacher?.fullName || classData.teacher?.username}</div>
                                        <Text type="secondary">Giảng viên chuyên môn</Text>
                                    </div>
                                </div>
                                <Divider className="my-4" />
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Text type="secondary">Tài khoản:</Text>
                                        <Text strong>{classData.teacher?.username || 'Chưa phân công'}</Text>
                                    </div>
                                    <div className="flex justify-between">
                                        <Text type="secondary">ID:</Text>
                                        <Text code>{classData.teacher?.id?.slice(-8) || 'N/A'}</Text>
                                    </div>
                                </div>
                            </Card>

                            {/* Manager Card */}
                            {classData.manager && (
                                <Card
                                    title={<Space><UserOutlined /> Giáo vụ quản lý</Space>}
                                    className="border-0 shadow-soft"
                                >
                                    <div className="flex items-center gap-4">
                                        <Avatar size={48} icon={<UserOutlined />} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${classData.manager.username}`} />
                                        <div>
                                            <div className="font-bold">{classData.manager.fullName || classData.manager.username}</div>
                                            <Text type="secondary" className="text-xs">Quản lý lớp học (Staff)</Text>
                                        </div>
                                    </div>
                                    <Divider className="my-4" />
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <Text type="secondary">Tài khoản:</Text>
                                            <Text strong>{classData.manager.username}</Text>
                                        </div>
                                        <div className="flex justify-between">
                                            <Text type="secondary">ID:</Text>
                                            <Text code>{classData.manager.id.slice(-8)}</Text>
                                        </div>
                                    </div>
                                </Card>
                            )}
                        </Col>
                    )}
                </Row>
            </div>

            {/* Enroll Modal */}
            <Modal
                title="Ghi danh học viên vào lớp"
                open={isEnrollModalOpen}
                onCancel={() => {
                    setIsEnrollModalOpen(false);
                    setSelectedStudentIds([]);
                }}
                onOk={handleEnroll}
                confirmLoading={loading}
                okText={`Ghi danh ${selectedStudentIds.length > 0 ? `(${selectedStudentIds.length})` : ''}`}
                cancelText="Hủy"
                okButtonProps={{ disabled: selectedStudentIds.length === 0 }}
                width={650}
            >
                <div className="space-y-4 py-4">
                    <Text>Tìm kiếm và chọn một hoặc nhiều học viên để thêm vào lớp <strong>{classData.title}</strong>.</Text>
                    <Select
                        mode="multiple"
                        showSearch
                        placeholder="Nhập tên đăng nhập hoặc họ tên để tìm kiếm..."
                        style={{ width: '100%' }}
                        defaultActiveFirstOption={false}
                        suffixIcon={<SearchOutlined />}
                        filterOption={false}
                        onSearch={searchStudents}
                        onChange={setSelectedStudentIds}
                        value={selectedStudentIds}
                        loading={searchLoading}
                        notFoundContent={searchLoading ? <Spin size="small" /> : 'Không tìm thấy học viên'}
                        size="large"
                        maxTagCount="responsive"
                    >
                        {availableStudents.map(s => {
                            const isAlreadyIn = classData.enrollments?.some(e => e.student?.id === s.id);
                            return (
                                <Select.Option key={s.id} value={s.id} disabled={isAlreadyIn}>
                                    <Space>
                                        <Avatar size="small" icon={<UserOutlined />} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s.username}`} />
                                        <span>{s.fullName && s.fullName !== s.username ? `${s.fullName} (@${s.username})` : s.username}</span>
                                        {isAlreadyIn && <Tag color="default" className="text-[10px]">Đã trong lớp</Tag>}
                                    </Space>
                                </Select.Option>
                            );
                        })}
                    </Select>
                </div>
            </Modal>

            {/* Edit Class Modal */}
            <Modal
                title="Chỉnh sửa thông tin lớp học"
                open={isEditModalOpen}
                onOk={handleEditSave}
                onCancel={() => setIsEditModalOpen(false)}
                okText="Cập nhật"
                cancelText="Hủy"
                width={600}
            >
                <Form form={form} layout="vertical" className="mt-4">
                    <Form.Item
                        name="title"
                        label="Mã lớp học"
                        rules={[{ required: true, message: 'Nhập mã lớp học' }]}
                    >
                        <Input placeholder="Nhập mã lớp học" />
                    </Form.Item>

                    <Form.Item
                        name="courseId"
                        label="Khóa học mẫu"
                        rules={[{ required: true }]}
                    >
                        <Select
                            showSearch
                            placeholder="Tìm kiếm khóa học..."
                            onSearch={(val) => handleSearchDebounced(val, 'course')}
                            filterOption={false}
                            loading={courseSearchLoading}
                            notFoundContent={courseSearchLoading ? <Spin size="small" /> : 'Không tìm thấy khóa học'}
                        >
                            {courses.map(c => <Select.Option key={c.id} value={c.id}>{c.title}</Select.Option>)}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="teacherId"
                        label="Giảng viên"
                        rules={[{ required: true }]}
                    >
                        <Select
                            showSearch
                            placeholder="Tìm kiếm giảng viên..."
                            onSearch={(val) => handleSearchDebounced(val, 'teacher')}
                            filterOption={false}
                            loading={teacherSearchLoading}
                            notFoundContent={teacherSearchLoading ? <Spin size="small" /> : 'Không tìm thấy giảng viên'}
                        >
                            {teachers.map(t => <Select.Option key={t.id} value={t.id}>{t.fullName || t.username}</Select.Option>)}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="managerId"
                        label="Giáo vụ quản lý"
                    >
                        <Select
                            showSearch
                            placeholder="Tìm kiếm giáo vụ..."
                            onSearch={(val) => handleSearchDebounced(val, 'manager')}
                            filterOption={false}
                            loading={managerSearchLoading}
                            notFoundContent={managerSearchLoading ? <Spin size="small" /> : 'Không tìm thấy giáo vụ'}
                            allowClear
                        >
                            {managers.map(m => <Select.Option key={m.id} value={m.id}>{m.fullName || m.username}</Select.Option>)}
                        </Select>
                    </Form.Item>

                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="dates" label="Thời gian học">
                            <RangePicker className="w-full" format="DD/MM/YYYY" />
                        </Form.Item>
                        <Form.Item name="status" label="Trạng thái">
                        <Select options={Object.entries(classStatuses)
                                .sort((a, b) => (a[1].order ?? 99) - (b[1].order ?? 99))
                                .map(([value, cfg]) => ({ value, label: cfg.label }))} />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>

            {/* View Progress Drawer */}
            <Drawer
                title={`Chi tiết học tập - ${selectedStudentForProgress?.student?.fullName || selectedStudentForProgress?.student?.username}`}
                open={isProgressModalOpen}
                onClose={() => setIsProgressModalOpen(false)}
                width={1000}
                bodyStyle={{ paddingBottom: 80 }}
            >
                {selectedStudentForProgress && (
                    <div className="space-y-6">
                        {progressLoading ? (
                            <div className="flex justify-center p-8"><Spin tip="Đang tải dữ liệu tiến độ..." /></div>
                        ) : progressData ? (
                            <>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Card className="bg-slate-50 border-0 text-center h-full flex flex-col justify-center">
                                            <h4 className="text-muted-foreground mb-4">Tỉ lệ chuẩn bị bài</h4>
                                            <Progress type="dashboard" percent={progressData.summary?.preparationPercent || 0} size={120} strokeColor="#f59e0b" />
                                            <div className="mt-2 text-sm text-muted-foreground">(Hoàn thành Video & Quiz)</div>
                                        </Card>
                                    </Col>
                                    <Col span={12}>
                                        <Card className="bg-slate-50 border-0 text-center h-full flex flex-col justify-center">
                                            <h4 className="text-muted-foreground mb-4">Tỉ lệ làm bài tập</h4>
                                            <Progress type="dashboard" percent={progressData.summary?.homeworkPercent || 0} size={120} strokeColor="#3b82f6" />
                                            <div className="mt-2 text-sm text-muted-foreground">(Đã nộp bài tự luận)</div>
                                        </Card>
                                    </Col>
                                </Row>

                                <div className="mt-8">
                                    <h3 className="text-lg font-bold mb-4">Danh sách Session</h3>
                                    <Table
                                        dataSource={progressData.sessions || []}
                                        rowKey="id"
                                        pagination={{ pageSize: 10 }}
                                        columns={[
                                            {
                                                title: 'STT',
                                                dataIndex: 'sessionNumber',
                                                width: 60,
                                            },
                                            {
                                                title: 'Bài học',
                                                dataIndex: 'title',
                                                render: (text: string) => <span className="font-medium">{text}</span>
                                            },
                                            {
                                                title: 'Bài đã nộp',
                                                dataIndex: 'submittedCount',
                                                width: 150,
                                                render: (count: number) => (
                                                    <span className="font-medium text-center">{count}</span>
                                                )
                                            },
                                            {
                                                title: 'Trạng thái',
                                                key: 'status',
                                                width: 180,
                                                render: (_, record: any) => (
                                                    record.isCompleted 
                                                        ? <Tag color="success" className="px-4 py-1 rounded-full text-sm">Hoàn thành</Tag> 
                                                        : <Tag color="error" className="px-4 py-1 rounded-full text-sm">Chưa hoàn thành</Tag>
                                                )
                                            }
                                        ]}
                                        expandable={{
                                            expandedRowRender: (record: any) => {
                                                if (!record.homeworks || record.homeworks.length === 0) {
                                                    return <div className="p-4 text-center text-muted-foreground bg-slate-50 rounded-lg mx-4">Không có về nhà nào trong Session này</div>;
                                                }
                                                return (
                                                    <div className="p-4 bg-slate-50 rounded-lg mx-4 border border-slate-200">
                                                        <h4 className="font-medium mb-3">Chi tiết bài tập</h4>
                                                        <Table
                                                            dataSource={record.homeworks}
                                                            rowKey="id"
                                                            pagination={false}
                                                            size="small"
                                                            columns={[
                                                                {
                                                                    title: 'STT',
                                                                    key: 'index',
                                                                    width: 60,
                                                                    render: (_text, _record, index) => index + 1
                                                                },
                                                                {
                                                                    title: 'Bài tập',
                                                                    key: 'title',
                                                                    render: (_, hw: any) => (
                                                                        <Space>
                                                                            <span className="font-medium">[{hw.level}] {hw.title}</span>
                                                                        </Space>
                                                                    )
                                                                },
                                                                {
                                                                    title: 'Link GitHub',
                                                                    dataIndex: 'githubLink',
                                                                    render: (link: string) => link ? <a href={link} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Link Github</a> : '-'
                                                                },
                                                                {
                                                                    title: 'Trạng thái',
                                                                    dataIndex: 'status',
                                                                    width: 120,
                                                                    render: (status: string) => {
                                                                        if (status === 'graded') return <Tag color="success">Đã chấm</Tag>;
                                                                        if (status === 'submitted') return <Tag color="blue">Đã nộp</Tag>;
                                                                        return <Tag color="default">Chưa nộp</Tag>;
                                                                    }
                                                                },
                                                                {
                                                                    title: 'Nhận xét của giảng viên',
                                                                    dataIndex: 'teacherFeedback',
                                                                    render: (feedback: string) => feedback || <span className="text-muted-foreground italic">Chưa có nhận xét</span>
                                                                }
                                                            ]}
                                                        />
                                                    </div>
                                                );
                                            }
                                        }}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-muted-foreground p-8">Không có dữ liệu tiến độ.</div>
                        )}
                    </div>
                )}
            </Drawer>

            <StudentDetailModal
                open={studentDetailOpen}
                onClose={() => setStudentDetailOpen(false)}
                studentId={viewingStudent?.id}
                initialStudent={viewingStudent}
                classId={id}
                className={classData?.title}
            />

            {classData && (
                <QuickAttendanceDrawer
                    open={attendanceDrawerVisible}
                    onClose={() => setAttendanceDrawerVisible(false)}
                    classData={classData}
                    onSuccess={fetchClassData}
                />
            )}
        </DashboardLayout>
    );
};

export default ClassDetail;
