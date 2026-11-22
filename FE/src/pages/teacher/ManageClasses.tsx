import React, { useState, useEffect, useRef } from 'react';
import { Card, Table, Button, Modal, Form, Input, Tag, Space, message, Select, DatePicker, List, Avatar, Typography, Spin, Dropdown, Row, Col, Drawer, Radio } from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    TeamOutlined,
    SearchOutlined,
    UserOutlined,
    EyeOutlined,
    MoreOutlined,
    ReloadOutlined,
    BookOutlined,
    CalendarOutlined,
    InfoCircleOutlined,
    UserAddOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemConstants, getStatusConfig } from '@/contexts/SystemContext';
import { StudentDetailModal } from '@/components/student/StudentDetailModal';
import { QuickAttendanceDrawer } from '@/components/attendance/QuickAttendanceDrawer';

const { RangePicker } = DatePicker;
const { Text } = Typography;

interface Class {
    id: string;
    title: string;
    courseId: string;
    teacherId: string;
    managerId?: string;
    startDate?: string;
    endDate?: string;
    status: string;
    course?: { title: string };
    teacher?: { username: string; fullName?: string };
    manager?: { username: string; fullName?: string };
    schedule?: {
        dayOfWeek: number[];
        shift: string;
    };
    _count?: { enrollments: number };
}

const TeacherManageClasses: React.FC = () => {
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();
    const { classStatuses } = useSystemConstants();
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const canEditEnrollments = user?.role === 'ADMIN' || user?.role === 'STAFF';

    // Student management states
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [selectedClassForStudents, setSelectedClassForStudents] = useState<Class | null>(null);
    const [classEnrollments, setClassEnrollments] = useState<any[]>([]);
    const [enrollmentLoading, setEnrollmentLoading] = useState(false);
    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [studentSearchLoading, setStudentSearchLoading] = useState(false);
    const [selectedStudentIdsToEnroll, setSelectedStudentIdsToEnroll] = useState<string[]>([]);
    const [isEnrollingBulk, setIsEnrollingBulk] = useState(false);
    const [studentDetailOpen, setStudentDetailOpen] = useState(false);
    const [viewingStudent, setViewingStudent] = useState<any>(null);

    // Quick Attendance states
    const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
    const [attendanceClass, setAttendanceClass] = useState<Class | null>(null);
    const [attendanceSessionNo, setAttendanceSessionNo] = useState<number | null>(null);
    const [attendanceList, setAttendanceList] = useState<any[]>([]);
    const [savingAttendance, setSavingAttendance] = useState(false);
    const [attendanceLoading, setAttendanceLoading] = useState(false);

    const calculateSessionDates = (cls: Class | null) => {
        if (!cls?.startDate || !cls?.schedule?.dayOfWeek) return [];

        const dates: Date[] = [];
        const start = new Date(cls.startDate);
        const end = cls.endDate ? new Date(cls.endDate) : null;
        const daysOfWeek = cls.schedule.dayOfWeek;

        const jsDays = daysOfWeek.map((d: number) => (d === 8 ? 0 : d - 1));

        let current = new Date(start);
        const maxSessions = cls.sessionCount || cls.course?.lessonCount || 30;

        while (dates.length < maxSessions) {
            if (end && current > end) break;

            const day = current.getDay();
            if (jsDays.includes(day)) {
                dates.push(new Date(current));
            }

            current.setDate(current.getDate() + 1);
        }

        return dates;
    };

    const openAttendanceModalFromTable = (record: Class) => {
        setAttendanceClass(record);
        setAttendanceSessionNo(null);
        setAttendanceList([]);
        setAttendanceModalVisible(true);
    };

    const handleFetchAttendance = async (sessionNo: number) => {
        if (!attendanceClass) return;
        setAttendanceSessionNo(sessionNo);
        setAttendanceLoading(true);
        try {
            const enrollRes = await apiFetch<any>(`/enrollments?where[class][id][equals]=${attendanceClass.id}&include[student]=true`);
            const students = (enrollRes.data?.items || (Array.isArray(enrollRes.data) ? enrollRes.data : [])).map((e: any) => e.student);
            
            const res = await apiFetch<any>(`/attendance/class/${attendanceClass.id}/session/${sessionNo}`);
            const savedData = res.data || [];
            
            const list = students.map((student: any) => {
                const saved = savedData.find((s: any) => s.studentId === student.id);
                return {
                    studentId: student.id,
                    student,
                    status: saved?.status || 'present',
                    note: saved?.note || ''
                };
            });
            setAttendanceList(list);
        } catch {
            message.error('Lỗi tải dữ liệu điểm danh');
        } finally {
            setAttendanceLoading(false);
        }
    };

    const handleSaveAttendance = async () => {
        if (!attendanceClass || !attendanceSessionNo) return;
        setSavingAttendance(true);
        try {
            await apiFetch(`/attendance/batch`, {
                method: 'POST',
                body: JSON.stringify({
                    classId: attendanceClass.id,
                    sessionNumber: attendanceSessionNo,
                    date: new Date(),
                    records: attendanceList.map(a => ({
                        studentId: a.studentId,
                        status: a.status,
                        note: a.note
                    }))
                })
            });
            message.success('Đã lưu điểm danh!');
            setAttendanceModalVisible(false);
        } catch {
            message.error('Lưu điểm danh thất bại');
        } finally {
            setSavingAttendance(false);
        }
    };

    // Search filters states
    const [courses, setCourses] = useState<any[]>([]);
    const [managers, setManagers] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [filterForm] = Form.useForm();

    const fetchCourses = async (title: string = "") => {
        try {
            const res = await apiFetch<any>(`/courses?take=100&where[title][contains]=${title}&where[title][mode]=insensitive`);
            setCourses(res.data || []);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchManagers = async (searchVal: string = "") => {
        try {
            if (searchVal) {
                const [resUsername, resFullName] = await Promise.all([
                    apiFetch<any>(`/users?where[roles][has]=STAFF&where[username][contains]=${searchVal}&take=50`),
                    apiFetch<any>(`/users?where[roles][has]=STAFF&where[fullName][contains]=${searchVal}&take=50`)
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
                const res = await apiFetch<any>(`/users?where[roles][has]=STAFF&take=50`);
                setManagers(res.data?.items || (Array.isArray(res.data) ? res.data : []));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchData = async (page = 1, limit = 10, filters: any = {}) => {
        setLoading(true);
        try {
            const skip = (page - 1) * limit;
            let query = `/classes?skip=${skip}&take=${limit}&orderBy[createdAt]=desc`;

            if (filters.title) {
                query += `&where[title][contains]=${filters.title}&where[title][mode]=insensitive`;
            }
            if (filters.courseId) {
                query += `&where[courseId][equals]=${filters.courseId}`;
            }
            if (filters.managerId) {
                query += `&where[managerId][equals]=${filters.managerId}`;
            }
            if (filters.status) {
                query += `&where[status][equals]=${filters.status}`;
            }
            if (filters.dates && filters.dates[0] && filters.dates[1]) {
                query += `&where[startDate][gte]=${filters.dates[0].startOf('day').toISOString()}`;
                query += `&where[startDate][lte]=${filters.dates[1].endOf('day').toISOString()}`;
            }

            const res = await apiFetch<any>(query);
            if (res.data && res.data.items) {
                setClasses(res.data.items);
                setTotal(res.data.total || 0);
            } else if (Array.isArray(res.data)) {
                setClasses(res.data);
                setTotal(res.data.length);
            } else {
                setClasses([]);
                setTotal(0);
            }
        } catch (error) {
            message.error('Không thể tải danh sách lớp học');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(currentPage, pageSize);
        fetchCourses();
        fetchManagers();
    }, [currentPage, pageSize]);

    const handleSearch = () => {
        const values = filterForm.getFieldsValue();
        setCurrentPage(1);
        fetchData(1, pageSize, values);
    };

    const handleReset = () => {
        filterForm.resetFields();
        setCurrentPage(1);
        fetchData(1, pageSize, {});
    };

    const handleManageStudents = (record: Class) => {
        setSelectedClassForStudents(record);
        setIsStudentModalOpen(true);
        fetchClassEnrollments(record.id);
        fetchPotentialStudents("");
    };

    const fetchClassEnrollments = async (classId: string) => {
        setEnrollmentLoading(true);
        try {
            const res = await apiFetch<any>(`/enrollments?where[class][id][equals]=${classId}&include[student]=true`);
            const enrollmentsData = res.data?.items || (Array.isArray(res.data) ? res.data : []);
            setClassEnrollments(enrollmentsData);
        } catch (error) {
            message.error('Lỗi khi tải danh sách học viên');
        } finally {
            setEnrollmentLoading(false);
        }
    };

    const fetchPotentialStudents = async (username?: string) => {
        setStudentSearchLoading(true);
        try {
            const query = username
                ? `/users?where[roles][has]=STUDENT&where[username][contains]=${username}&take=20`
                : `/users?where[roles][has]=STUDENT&take=20`;
            const res = await apiFetch<any>(query);
            const studentsData = res.data?.items || (Array.isArray(res.data) ? res.data : []);
            setAllStudents(studentsData);
        } catch (error) {
            console.error(error);
        } finally {
            setStudentSearchLoading(false);
        }
    };



    const handleSearchDebounced = (value: string, type: 'student') => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            if (type === 'student') fetchPotentialStudents(value);
        }, 500);
    };

    const handleEnrollBulk = async () => {
        if (!selectedClassForStudents || selectedStudentIdsToEnroll.length === 0) return;
        setIsEnrollingBulk(true);
        try {
            const res = await apiFetch<any>(`/classes/${selectedClassForStudents.id}/enroll-bulk`, {
                method: 'POST',
                body: JSON.stringify({ userIds: selectedStudentIdsToEnroll })
            });
            const count = res.data?.count ?? selectedStudentIdsToEnroll.length;
            message.success(`Thêm thành công ${count} học viên vào lớp!`);
            setSelectedStudentIdsToEnroll([]);
            fetchClassEnrollments(selectedClassForStudents.id);
            fetchData();
        } catch (error: any) {
            message.error(error.message || 'Lỗi ghi danh');
        } finally {
            setIsEnrollingBulk(false);
        }
    };

    const handleEnrollStudent = async (studentId: string) => {
        if (!selectedClassForStudents) return;
        try {
            const res = await apiFetch<any>(`/classes/${selectedClassForStudents.id}/enroll-bulk`, {
                method: 'POST',
                body: JSON.stringify({ userIds: [studentId] })
            });
            message.success('Thêm học viên thành công!');
            fetchClassEnrollments(selectedClassForStudents.id);
            fetchData(); // Update count in main table
        } catch (error: any) {
            message.error(error.message || 'Lỗi ghi danh');
        }
    };

    const handleRemoveStudent = async (enrollmentId: string) => {
        try {
            const res = await apiFetch<any>(`/enrollments/${enrollmentId}`, { method: 'DELETE' });
            message.success(res.message || 'Đã gỡ học viên khỏi lớp');
            if (selectedClassForStudents) {
                fetchClassEnrollments(selectedClassForStudents.id);
            }
            fetchData(); // Update count in main table
        } catch (error) {
            message.error('Lỗi khi gỡ học viên');
        }
    };


    const columns = [
        {
            title: 'Lớp học',
            dataIndex: 'title',
            key: 'title',
            render: (text: string) => <span className="font-bold">{text}</span>
        },
        {
            title: 'Khóa học',
            dataIndex: ['course', 'title'],
            key: 'course',
            render: (text: string) => <Tag color="blue">{text}</Tag>
        },
        {
            title: 'Người quản lý',
            dataIndex: ['manager', 'username'],
            key: 'manager',
            render: (text: string, record: Class) => record.manager ? <Tag color="orange">{record.manager.fullName || record.manager.username}</Tag> : <Tag>Chưa gán</Tag>
        },
        {
            title: 'Thời gian',
            key: 'time',
            render: (record: Class) => (
                <div className="space-y-1">
                    <div className="text-xs flex items-center gap-2">
                        <Tag color="cyan" className="m-0 px-1 text-[10px] uppercase font-bold">
                            {record.schedule?.shift || 'N/A'}
                        </Tag>
                        <span className="text-slate-500">
                            {record.schedule?.dayOfWeek?.map(d => `T${d}`).join(', ') || '---'}
                        </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <span>{record.startDate ? dayjs(record.startDate).format('DD/MM/YYYY') : '---'}</span>
                        <span>-</span>
                        <span>{record.endDate ? dayjs(record.endDate).format('DD/MM/YYYY') : '---'}</span>
                    </div>
                </div>
            )
        },
        {
            title: 'Học viên',
            key: 'students',
            render: (record: Class) => record._count?.enrollments || 0
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            render: (status: string) => {
                const st = getStatusConfig(classStatuses, status);
                return <Tag color={st.color} className="border-0 rounded-full px-3">{st.label}</Tag>;
            },
        },
        {
            title: 'Hành động',
            key: 'actions',
            width: 120,
            align: 'center' as const,
            fixed: 'right' as const,
            render: (_: any, record: Class) => {
                const menuItems = [
                    {
                        key: 'view',
                        icon: <EyeOutlined />,
                        label: 'Xem chi tiết',
                        onClick: () => navigate(`/admin/class/${record.id}`),
                    },
                    ...(!['gathering', 'cancelled'].includes(record.status) ? [
                        {
                            key: 'quick_attendance',
                            icon: <CalendarOutlined />,
                            label: 'Điểm danh nhanh',
                            onClick: () => openAttendanceModalFromTable(record),
                        },
                        {
                            key: 'assignments',
                            icon: <BookOutlined />,
                            label: 'Chấm bài tập',
                            onClick: () => navigate(`/teacher/class/${record.id}/assignments`),
                        }
                    ] : []),
                ];

                return (
                    <Dropdown menu={{ items: menuItems }} trigger={['hover']} placement="bottomRight">
                        <Button type="text" size="small" icon={<MoreOutlined />} style={{ fontSize: '18px' }} />
                    </Dropdown>
                );
            },
        },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Quản lý Lớp học của tôi</h1>
                        <p className="text-muted-foreground">Tạo và quản lý các lớp học do bạn giảng dạy</p>
                    </div>
                </div>

                <Card className="border-0 shadow-soft">
                    {/* Search Form */}
                    <div className="mb-6 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                        <Form form={filterForm} layout="vertical" onFinish={handleSearch}>
                            <Row gutter={[16, 16]} align="bottom">
                                <Col xs={24} sm={12} lg={6}>
                                    <Form.Item name="title" label="Mã lớp học" className="mb-0">
                                        <Input
                                            placeholder="Mã lớp..."
                                            prefix={<SearchOutlined className="text-slate-400" />}
                                            allowClear
                                            onPressEnter={handleSearch}
                                        />
                                    </Form.Item>
                                </Col>

                                <Col xs={24} sm={12} lg={6}>
                                    <Form.Item name="courseId" label="Khóa học" className="mb-0">
                                        <Select
                                            placeholder="Chọn khóa học"
                                            allowClear
                                            showSearch
                                            filterOption={(input, option) =>
                                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                            }
                                            options={courses.map(c => ({ value: c.id, label: c.title }))}
                                        />
                                    </Form.Item>
                                </Col>

                                <Col xs={24} sm={12} lg={6}>
                                    <Form.Item name="managerId" label="Người quản lý" className="mb-0">
                                        <Select
                                            placeholder="Người quản lý"
                                            allowClear
                                            showSearch
                                            filterOption={(input, option) =>
                                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                            }
                                            options={managers.map(m => ({ value: m.id, label: m.fullName || m.username }))}
                                        />
                                    </Form.Item>
                                </Col>

                                <Col xs={24} sm={12} lg={6}>
                                    <Form.Item name="status" label="Trạng thái" className="mb-0">
                                        <Select
                                            placeholder="Tất cả trạng thái"
                                            allowClear
                                            options={Object.entries(classStatuses)
                                                .filter(([value]) => !['gathering', 'cancelled'].includes(value))
                                                .sort((a, b) => (a[1].order ?? 99) - (b[1].order ?? 99))
                                                .map(([value, cfg]) => ({ value, label: cfg.label }))}
                                        />
                                    </Form.Item>
                                </Col>

                                <Col xs={24} sm={12} lg={6}>
                                    <Form.Item name="dates" label="Thời gian bắt đầu" className="mb-0">
                                        <RangePicker
                                            className="w-full"
                                            placeholder={['Từ ngày', 'Đến ngày']}
                                            format="DD/MM/YYYY"
                                        />
                                    </Form.Item>
                                </Col>

                                <Col xs={24} sm={12} lg={18}>
                                    <Space className="w-full justify-end">
                                        <Button
                                            type="primary"
                                            icon={<SearchOutlined />}
                                            onClick={handleSearch}
                                            className="rounded-lg px-6"
                                        >
                                            Tìm kiếm
                                        </Button>
                                        <Button
                                            icon={<ReloadOutlined />}
                                            onClick={handleReset}
                                            className="rounded-lg text-slate-600 border-slate-200"
                                        >
                                            Đặt lại
                                        </Button>
                                    </Space>
                                </Col>
                            </Row>
                        </Form>
                    </div>

                    <Table
                        dataSource={classes}
                        columns={columns}
                        rowKey="id"
                        loading={loading}
                        pagination={{
                            current: currentPage,
                            pageSize: pageSize,
                            total: total,
                            onChange: (page, size) => {
                                setCurrentPage(page);
                                setPageSize(size);
                            },
                            showSizeChanger: true,
                            pageSizeOptions: ['10', '20', '50'],
                            showTotal: (total) => `Tổng cộng ${total} lớp học`,
                        }}
                        scroll={{ x: 'max-content' }}
                    />
                </Card>


                <Modal
                    title={canEditEnrollments ? `Quản lý học viên - ${selectedClassForStudents?.title}` : `Danh sách học viên - ${selectedClassForStudents?.title}`}
                    open={isStudentModalOpen}
                    onCancel={() => setIsStudentModalOpen(false)}
                    footer={null}
                    width={700}
                >
                    <div className="space-y-4 py-4">
                        {canEditEnrollments && (
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                                <div className="flex items-center justify-between">
                                    <Text strong className="text-xs text-slate-700">Thêm học viên vào lớp:</Text>
                                    {allStudents.length > 0 && (
                                        <Button
                                            size="small"
                                            type="dashed"
                                            onClick={() => {
                                                const enrolledIds = new Set(classEnrollments.map((e: any) => e.student?.id));
                                                const notEnrolled = allStudents.filter(s => !enrolledIds.has(s.id));
                                                setSelectedStudentIdsToEnroll(notEnrolled.map(s => s.id));
                                            }}
                                        >
                                            Chọn tất cả chưa vào lớp
                                        </Button>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Select
                                        mode="multiple"
                                        showSearch
                                        placeholder="Tìm kiếm và chọn nhiều học viên..."
                                        style={{ flex: 1 }}
                                        onSearch={(val) => handleSearchDebounced(val, 'student')}
                                        onChange={(vals) => setSelectedStudentIdsToEnroll(vals)}
                                        value={selectedStudentIdsToEnroll}
                                        loading={studentSearchLoading}
                                        filterOption={false}
                                        suffixIcon={<SearchOutlined />}
                                        notFoundContent={studentSearchLoading ? <Spin size="small" /> : 'Không tìm thấy học viên'}
                                        maxTagCount="responsive"
                                    >
                                        {(() => {
                                            const enrolledIds = new Set(classEnrollments.map((e: any) => e.student?.id));
                                            return allStudents.map(s => {
                                                const isEnrolled = enrolledIds.has(s.id);
                                                const titleText = s.fullName || s.username;
                                                return (
                                                    <Select.Option key={s.id} value={s.id} disabled={isEnrolled}>
                                                        <Space>
                                                            <Avatar size="small" icon={<UserOutlined />} />
                                                            {titleText}
                                                            {s.email && titleText !== s.email && (
                                                                <span className="text-muted-foreground text-xs ml-1">({s.email})</span>
                                                            )}
                                                            {isEnrolled && (
                                                                <Tag color="default" className="text-[10px] ml-1">Đã trong lớp</Tag>
                                                            )}
                                                        </Space>
                                                    </Select.Option>
                                                );
                                            });
                                        })()}
                                    </Select>
                                    <Button
                                        type="primary"
                                        icon={<UserAddOutlined />}
                                        onClick={handleEnrollBulk}
                                        loading={isEnrollingBulk}
                                        disabled={selectedStudentIdsToEnroll.length === 0}
                                    >
                                        Thêm ({selectedStudentIdsToEnroll.length})
                                    </Button>
                                </div>
                            </div>
                        )}

                        <List
                            loading={enrollmentLoading}
                            dataSource={classEnrollments}
                            header={<div className="font-bold">{classEnrollments.length} Học viên trong lớp</div>}
                            renderItem={(item) => (
                                <List.Item
                                    actions={canEditEnrollments ? [
                                        <Button
                                            key="remove"
                                            type="text"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() => handleRemoveStudent(item.id)}
                                        >
                                            Gỡ
                                        </Button>
                                    ] : []}
                                >
                                    <List.Item.Meta
                                        avatar={<Avatar icon={<UserOutlined />} className="cursor-pointer hover:ring-2 ring-blue-500 transition-all shrink-0" onClick={() => { setViewingStudent(item.student); setStudentDetailOpen(true); }} />}
                                        title={
                                            <span 
                                                className="cursor-pointer font-bold text-slate-800 hover:text-blue-600 transition-colors flex items-center gap-1.5"
                                                onClick={() => { setViewingStudent(item.student); setStudentDetailOpen(true); }}
                                                title="Nhấn để xem thông tin học viên"
                                            >
                                                {item.student?.fullName || item.student?.username}
                                                <InfoCircleOutlined className="text-xs text-blue-500 opacity-60 hover:opacity-100" />
                                            </span>
                                        }
                                        description={(item.student?.fullName || item.student?.username) !== item.student?.email ? item.student?.email : undefined}
                                    />
                                </List.Item>
                            )}
                            className="max-h-[400px] overflow-y-auto"
                        />
                    </div>
                </Modal>

                <QuickAttendanceDrawer
                    open={attendanceModalVisible}
                    onClose={() => setAttendanceModalVisible(false)}
                    classData={attendanceClass}
                    initialSessionNo={attendanceSessionNo}
                    onSuccess={() => fetchData()}
                />
            </div>

            <StudentDetailModal
                open={studentDetailOpen}
                onClose={() => setStudentDetailOpen(false)}
                studentId={viewingStudent?.id}
                initialStudent={viewingStudent}
                classId={selectedClassForStudents?.id || attendanceClass?.id}
                className={selectedClassForStudents?.title || attendanceClass?.title}
            />
        </DashboardLayout>
    );
};

export default TeacherManageClasses;
