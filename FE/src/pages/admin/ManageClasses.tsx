import React, { useState, useEffect, useCallback } from 'react';
import {
    Card,
    Table,
    Button,
    Modal,
    Form,
    Input,
    Tag,
    Space,
    Select,
    DatePicker,
    List,
    Avatar,
    Typography,
    Spin,
    Dropdown,
    Drawer,
    App,
    Row,
    Col,
    Radio,
    Tabs
} from 'antd';
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
    ClockCircleOutlined,
    CalendarOutlined,
    ImportOutlined,
    UserAddOutlined,
    CheckOutlined,
    InfoCircleOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiFetch } from '@/lib/api';
import { CLASS_STATUS_CONFIG } from '@/lib/constants';
import { useSystemConstants, getStatusConfig } from '@/contexts/SystemContext';
import { useAuth } from '@/contexts/AuthContext';
import { StudentImport } from './components/StudentImport';
import { StudentDetailModal } from '@/components/student/StudentDetailModal';
import { QuickAttendanceDrawer } from '@/components/attendance/QuickAttendanceDrawer';

const { RangePicker } = DatePicker;
const { Text } = Typography;

interface ClassSchedule {
    id: string;
    classId: string;
    dayOfWeek: number[];  // [2,4] = Thứ 2, Thứ 4
    shift: string;        // 'CA6'
    startTime?: string;
    endTime?: string;
    note?: string;
}

interface ScheduleMeta {
    shifts: { value: string; label: string; startTime: string; endTime: string }[];
    days: { value: number; label: string }[];
}

interface Class {
    id: string;
    title: string;
    courseId?: string;
    teacherId?: string;
    managerId?: string;
    startDate?: string;
    endDate?: string;
    status: "active" | "finished" | "cancelled";
    schedule?: ClassSchedule;
    createdAt: string;
    course?: { title: string };
    teacher?: { username: string; fullName?: string };
    manager?: { username: string; fullName?: string };
    _count?: { enrollments: number };
}

const ManageClassesContent: React.FC = () => {
    const { notification, modal } = App.useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const { user: currentUser } = useAuth();

    // Data states
    const [classes, setClasses] = useState<Class[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [managers, setManagers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [scheduleMeta, setScheduleMeta] = useState<ScheduleMeta>({ shifts: [], days: [] });
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const { classStatuses } = useSystemConstants();

    // Pagination & Filter states
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [filterForm] = Form.useForm();

    // Drawer/Modal states
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<Class | null>(null);
    const [form] = Form.useForm();
    const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

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

    // Search dropdown loading states
    const [courseSearchLoading, setCourseSearchLoading] = useState(false);
    const [teacherSearchLoading, setTeacherSearchLoading] = useState(false);
    const [managerSearchLoading, setManagerSearchLoading] = useState(false);

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
            if (jsDays.includes(current.getDay())) dates.push(new Date(current));
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
            notification.error({ message: 'Lỗi', description: 'Lỗi tải dữ liệu điểm danh' });
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
            notification.success({ message: 'Thành công', description: 'Đã lưu điểm danh!' });
            setAttendanceModalVisible(false);
        } catch {
            notification.error({ message: 'Lỗi', description: 'Lưu điểm danh thất bại' });
        } finally {
            setSavingAttendance(false);
        }
    };

    const fetchData = useCallback(async (page = 1, limit = 10, filters = {}) => {
        setLoading(true);
        try {
            const skip = (page - 1) * limit;
            let query = `/classes?skip=${skip}&take=${limit}&orderBy[createdAt]=desc`;

            // Build Prisma-style where clause
            Object.entries(filters).forEach(([key, value]) => {
                if (value) {
                    if (key === 'createdAt' && Array.isArray(value)) {
                        const [start, end] = value;
                        query += `&where[createdAt][gte]=${start.startOf('day').toISOString()}`;
                        query += `&where[createdAt][lte]=${end.endOf('day').toISOString()}`;
                    } else if (key === 'status' && value !== 'all') {
                        query += `&where[status][equals]=${value}`;
                    } else if (key === 'courseId') {
                        query += `&where[courseId][equals]=${value}`;
                    } else if (key === 'teacherId') {
                        query += `&where[teacherId][equals]=${value}`;
                    } else if (key === 'managerId') {
                        query += `&where[managerId][equals]=${value}`;
                    } else if (value !== 'all') {
                        query += `&where[${key}][contains]=${value}`;
                    }
                }
            });

            if (currentUser?.role === 'STAFF') {
                query += `&where[managerId][equals]=${currentUser.id}`;
            }

            const res = await apiFetch<any>(query);

            if (res.data && res.data.items) {
                setClasses(res.data.items);
                setTotal(res.data.total || 0);
            } else {
                const dataArray = Array.isArray(res.data) ? res.data : [];
                setClasses(dataArray);
                setTotal(dataArray.length);
            }
        } catch (error) {
            notification.error({
                message: 'Lỗi tải dữ liệu',
                description: 'Không thể tải danh sách lớp học',
            });
        } finally {
            setLoading(false);
        }
    }, [notification]);

    useEffect(() => {
        let currentFilters = filterForm.getFieldsValue();
        const stateTitle = location.state?.searchTitle;
        
        if (stateTitle && currentFilters.title !== stateTitle) {
            filterForm.setFieldsValue({ title: stateTitle });
            currentFilters = { ...currentFilters, title: stateTitle };
            // Optional: Remove state so it doesn't persist on subsequent local navigation
            window.history.replaceState({}, document.title);
        }

        fetchData(currentPage, pageSize, currentFilters);
    }, [currentPage, pageSize, fetchData, location.state, filterForm]);

    // Initial search data for filters + schedule meta
    useEffect(() => {
        fetchCourses("");
        fetchTeachers("");
        fetchManagers("");
        fetchScheduleMeta();
    }, []);

    const fetchScheduleMeta = async () => {
        try {
            const res = await apiFetch<any>('/class-schedules/meta');
            setScheduleMeta(res.data || { shifts: [], days: [] });
        } catch (e) {
            console.error('Không thể tải meta lịch học', e);
        }
    };

    /**
     * Tự động tính ngày kết thúc dựa trên:
     * - lessonCount: số bài học của khóa học (= số buổi)
     * - daysOfWeek: các thứ học trong tuần (số lượng ngày/tuần)
     * - startDate: ngày bắt đầu
     */
    const autoCalculateEndDate = (lessonCount: number, daysOfWeek: number[], startDate: dayjs.Dayjs, userEndDate?: dayjs.Dayjs) => {
        if (!lessonCount || !daysOfWeek?.length || !startDate) return;

        const daysPerWeek = daysOfWeek.length;
        const weeksNeeded = Math.ceil(lessonCount / daysPerWeek);

        // Tính ngày kết thúc: đi từng ngày, đếm đúng đủ lessonCount ngày học
        let sessionsLeft = lessonCount;
        let current = startDate.clone();
        let calculatedEndDate = startDate.clone();

        while (sessionsLeft > 0) {
            // dayjs: 0=CN, 1=T2...6=T7; schema: 2=T2...8=CN
            const dayOfWeekSchema = current.day() === 0 ? 8 : current.day() + 1;
            if (daysOfWeek.includes(dayOfWeekSchema)) {
                sessionsLeft--;
                calculatedEndDate = current.clone();
            }
            if (sessionsLeft > 0) current = current.add(1, 'day');
        }

        const currentDates = form.getFieldValue('dates');
        
        // Nếu ngày kết thúc người dùng chọn lớn hơn hoặc bằng ngày kết thúc kiến nghị, giữ nguyên lựa chọn của họ
        let finalEndDate = calculatedEndDate;
        if (userEndDate && (userEndDate.isAfter(calculatedEndDate) || userEndDate.isSame(calculatedEndDate, 'day'))) {
            finalEndDate = userEndDate;
        }

        form.setFieldsValue({
            dates: [currentDates?.[0] || startDate, finalEndDate]
        });

        notification.info({
            key: 'endDateSuggestion',
            message: 'Gợi ý ngày kết thúc',
            description: `${lessonCount} buổi × ${daysPerWeek} ngày/tuần ≈ ${weeksNeeded} tuần → Dự kiến kết thúc ${calculatedEndDate.format('DD/MM/YYYY')}`,
            placement: 'bottomRight',
            duration: 4,
        });
    };

    const handleCourseSelect = (courseId: string) => {
        const course = courses.find(c => c.id === courseId);
        setSelectedCourse(course || null);
        // Trigger tính lại nếu đã có lịch học và ngày bắt đầu
        const days = form.getFieldValue('scheduleDays');
        const dates = form.getFieldValue('dates');
        if (course?.lessonCount && days?.length > 0 && dates?.[0]) {
            autoCalculateEndDate(course.lessonCount, days, dates[0], dates[1] || undefined);
        }
    };

    const handleScheduleDaysChange = (days: number[]) => {
        const dates = form.getFieldValue('dates');
        if (selectedCourse?.lessonCount && days?.length > 0 && dates?.[0]) {
            autoCalculateEndDate(selectedCourse.lessonCount, days, dates[0], dates[1] || undefined);
        }
    };

    const handleStartDateChange = (dates: any) => {
        const days = form.getFieldValue('scheduleDays');
        if (selectedCourse?.lessonCount && days?.length > 0 && dates?.[0]) {
            autoCalculateEndDate(selectedCourse.lessonCount, days, dates[0], dates[1] || undefined);
        }
    };

    const handleSearch = (values: any) => {
        setCurrentPage(1);
        fetchData(1, pageSize, values);
    };

    const handleReset = () => {
        filterForm.resetFields();
        setCurrentPage(1);
        fetchData(1, pageSize);
    };

    const handleTableChange = (pagination: any) => {
        setCurrentPage(pagination.current);
        setPageSize(pagination.pageSize);
    };

    const fetchCourses = async (title?: string) => {
        setCourseSearchLoading(true);
        try {
            const query = title
                ? `/courses?where[status][equals]=active&where[title][contains]=${title}&take=20`
                : `/courses?where[status][equals]=active&take=20`;
            const res = await apiFetch<any>(query);
            setCourses(res.data?.items || (Array.isArray(res.data) ? res.data : []));
        } catch (error) {
            console.error(error);
        } finally {
            setCourseSearchLoading(false);
        }
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
        } catch (error) {
            console.error(error);
        } finally {
            setTeacherSearchLoading(false);
        }
    };

    const fetchManagers = async (username?: string) => {
        setManagerSearchLoading(true);
        try {
            if (username) {
                const [resUsername, resFullName] = await Promise.all([
                    apiFetch<any>(`/users?where[roles][hasSome][0]=STAFF&where[roles][hasSome][1]=HEAD_STAFF&where[username][contains]=${username}&take=20`),
                    apiFetch<any>(`/users?where[roles][hasSome][0]=STAFF&where[roles][hasSome][1]=HEAD_STAFF&where[fullName][contains]=${username}&take=20`)
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
                const res = await apiFetch<any>(`/users?where[roles][hasSome][0]=STAFF&where[roles][hasSome][1]=HEAD_STAFF&take=20`);
                setManagers(res.data?.items || (Array.isArray(res.data) ? res.data : []));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setManagerSearchLoading(false);
        }
    };

    const handleSearchDebounced = (value: string, type: 'student' | 'course' | 'teacher' | 'manager') => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            if (type === 'student') fetchPotentialStudents(value);
            if (type === 'course') fetchCourses(value);
            if (type === 'teacher') fetchTeachers(value);
            if (type === 'manager') fetchManagers(value);
        }, 500);
    };

    const handleAdd = () => {
        setEditingClass(null);
        form.resetFields();
        form.setFieldsValue({ 
            status: "gathering",
            managerId: currentUser?.id
        });

        // Add current user to managers list if not already there so the dropdown can display their name
        if (currentUser && !managers.some(m => m.id === currentUser.id)) {
            setManagers(prev => [...prev, { id: currentUser.id, username: currentUser.username, fullName: currentUser.fullName }]);
        }

        setIsDrawerOpen(true);
    };

    const handleEdit = (record: Class) => {
        setEditingClass(record);
        // Lưu lại course đang chọn để tính toán endDate
        const course = courses.find(c => c.id === record.courseId);
        setSelectedCourse(course || null);
        form.setFieldsValue({
            ...record,
            dates: record.startDate && record.endDate ? [dayjs(record.startDate), dayjs(record.endDate)] : null,
            courseId: record.courseId,
            teacherId: record.teacherId,
            managerId: record.managerId,
            scheduleDays: record.schedule?.dayOfWeek || [],
            scheduleShift: record.schedule?.shift || undefined,
            scheduleNote: record.schedule?.note || undefined,
        });
        setIsDrawerOpen(true);
        if (record.course) setCourses(prev => prev.find(c => c.id === record.courseId) ? prev : [...prev, { id: record.courseId, title: record.course?.title }]);
        if (record.teacher) setTeachers(prev => prev.find(t => t.id === record.teacherId) ? prev : [...prev, { id: record.teacherId, username: record.teacher?.username, fullName: record.teacher?.fullName }]);
        if (record.manager) setManagers(prev => prev.find(m => m.id === record.managerId) ? prev : [...prev, { id: record.managerId, username: record.manager?.username, fullName: record.manager?.fullName }]);
    };

    const handleDelete = (id: string) => {
        modal.confirm({
            title: 'Xác nhận xóa',
            content: 'Bạn có chắc chắn muốn xóa lớp học này? Hành động này không thể hoàn tác.',
            okText: 'Xóa ngay',
            cancelText: 'Hủy',
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await apiFetch<any>(`/classes/${id}`, { method: 'DELETE' });
                    notification.success({ message: 'Thành công', description: 'Đã xóa lớp học khỏi hệ thống' });
                    fetchData(currentPage, pageSize, filterForm.getFieldsValue());
                } catch (error) {
                    notification.error({ message: 'Thất bại', description: 'Lỗi khi xóa lớp học' });
                }
            },
        });
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
            setClassEnrollments(Array.isArray(res.data) ? res.data : (res.data?.items || []));
        } catch (error) {
            notification.error({ message: 'Lỗi', description: 'Không thể tải danh sách học viên' });
        } finally {
            setEnrollmentLoading(false);
        }
    };

    const fetchPotentialStudents = async (username?: string) => {
        setStudentSearchLoading(true);
        try {
            const query = username
                ? `/users?where[roles][has]=STUDENT&where[username][contains]=${username}&take=50`
                : `/users?where[roles][has]=STUDENT&take=50`;
            const res = await apiFetch<any>(query);
            setAllStudents(res.data?.items || (Array.isArray(res.data) ? res.data : []));
        } catch (error) {
            console.error(error);
        } finally {
            setStudentSearchLoading(false);
        }
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
            notification.success({
                message: 'Ghi danh thành công',
                description: `Đã thêm ${count} học viên vào lớp ${selectedClassForStudents.title}!`
            });
            setSelectedStudentIdsToEnroll([]);
            fetchClassEnrollments(selectedClassForStudents.id);
            fetchData(currentPage, pageSize, filterForm.getFieldsValue());
        } catch (error: any) {
            notification.error({ message: 'Lỗi ghi danh', description: error.message || 'Không thể thêm học viên' });
        } finally {
            setIsEnrollingBulk(false);
        }
    };

    const handleEnrollStudent = async (studentId: string) => {
        if (!selectedClassForStudents) return;
        try {
            await apiFetch<any>(`/classes/${selectedClassForStudents.id}/enroll-bulk`, {
                method: 'POST',
                body: JSON.stringify({ userIds: [studentId] })
            });
            notification.success({ message: 'Đã ghi danh', description: 'Thêm học viên vào lớp thành công' });
            fetchClassEnrollments(selectedClassForStudents.id);
            fetchData(currentPage, pageSize, filterForm.getFieldsValue());
        } catch (error: any) {
            notification.error({ message: 'Lỗi ghi danh', description: error.message });
        }
    };

    const handleRemoveStudent = async (enrollmentId: string) => {
        try {
            await apiFetch<any>(`/enrollments/${enrollmentId}`, { method: 'DELETE' });
            notification.success({ message: 'Thành công', description: 'Đã gỡ học viên khỏi lớp' });
            if (selectedClassForStudents) fetchClassEnrollments(selectedClassForStudents.id);
            fetchData(currentPage, pageSize, filterForm.getFieldsValue());
        } catch (error) {
            notification.error({ message: 'Thất bại', description: 'Không thể gỡ học viên' });
        }
    };

    const handleDrawerSubmit = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            // Pre-validation: Check for teacher schedule conflict
            if (values.teacherId && values.scheduleDays?.length > 0 && values.scheduleShift && !['cancelled', 'finished'].includes(values.status)) {
                const res = await apiFetch<any>(`/classes?where[teacherId][equals]=${values.teacherId}&take=50`);
                const teacherClasses = res.data?.items || (Array.isArray(res.data) ? res.data : []);
                
                let hasConflict = false;
                let conflictClass = null;

                for (const c of teacherClasses) {
                    if (editingClass && c.id === editingClass.id) continue;
                    if (['cancelled', 'finished'].includes(c.status)) continue;
                    if (!c.schedule) continue;

                    // Check schedule shift and days
                    if (c.schedule.shift !== values.scheduleShift) continue;
                    const overlapsDay = values.scheduleDays.some((d: number) => c.schedule!.dayOfWeek.includes(d));
                    if (!overlapsDay) continue;

                    // Check dates overlap
                    const currentStart = values.dates?.[0] ? dayjs(values.dates[0]).startOf('day') : null;
                    const currentEnd = values.dates?.[1] ? dayjs(values.dates[1]).endOf('day') : null;
                    const cStart = c.startDate ? dayjs(c.startDate).startOf('day') : null;
                    const cEnd = c.endDate ? dayjs(c.endDate).endOf('day') : null;

                    let datesOverlap = true; // Assume overlap if dates are missing to prevent booking same shift
                    if (currentStart && cStart) {
                        if (!currentEnd && !cEnd) {
                            datesOverlap = true;
                        } else if (!currentEnd) {
                            datesOverlap = currentStart.isBefore(cEnd) || currentStart.isSame(cEnd);
                        } else if (!cEnd) {
                            datesOverlap = cStart.isBefore(currentEnd) || cStart.isSame(currentEnd);
                        } else {
                            datesOverlap = (currentStart.isBefore(cEnd) || currentStart.isSame(cEnd)) && 
                                           (cStart.isBefore(currentEnd) || cStart.isSame(currentEnd));
                        }
                    }

                    if (datesOverlap) {
                        hasConflict = true;
                        conflictClass = c;
                        break;
                    }
                }

                if (hasConflict && conflictClass) {
                    notification.error({
                        message: 'Trùng lịch giảng viên',
                        description: `Giảng viên đã có lịch dạy lớp "${conflictClass.title}" trùng ca và ngày học với thiết lập hiện tại. Vui lòng đổi lịch hoặc chọn người khác.`,
                        placement: 'topRight',
                        duration: 6
                    });
                    setLoading(false);
                    return;
                }
            }

            const payload = {
                title: values.title,
                courseId: values.courseId || null,
                teacherId: values.teacherId || null,
                managerId: currentUser?.role === 'STAFF' ? currentUser.id : (values.managerId || null),
                status: values.status,
                startDate: values.dates?.[0]?.toISOString() || null,
                endDate: values.dates?.[1]?.toISOString() || null,
                sessionCount: selectedCourse?.lessonCount || 30
            };

            let savedClassId: string;

            if (editingClass) {
                await apiFetch<any>(`/classes/${editingClass.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(payload),
                });
                savedClassId = editingClass.id;
                notification.success({ message: 'Cập nhật thành công', description: `Lớp học ${values.title} đã được lưu lại` });
            } else {
                const res = await apiFetch<any>('/classes', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                savedClassId = res.data?.id;
                notification.success({ message: 'Khởi tạo thành công', description: `Đã mở lớp học mới: ${values.title}` });
            }

            // Lưu lịch học nếu có chọn
            if (savedClassId && values.scheduleDays?.length > 0 && values.scheduleShift) {
                await apiFetch<any>('/class-schedules', {
                    method: 'POST',
                    body: JSON.stringify({
                        classId: savedClassId,
                        dayOfWeek: values.scheduleDays,
                        shift: values.scheduleShift,
                        note: values.scheduleNote || null,
                    }),
                });
            }

            fetchData(currentPage, pageSize, filterForm.getFieldsValue());
            setIsDrawerOpen(false);
        } catch (error: any) {
            notification.error({ message: 'Có lỗi xảy ra', description: error.message || 'Vui lòng kiểm tra lại thông tin form' });
        } finally {
            setLoading(false);
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
            title: 'Lịch học',
            dataIndex: 'schedule',
            key: 'schedule',
            render: (sch: ClassSchedule) => sch ? (
                <Tag color="purple" icon={<ClockCircleOutlined />} className="rounded-full px-3">
                    {sch.dayOfWeek.map(d => `T${d === 8 ? 'CN' : d}`).join(', ')} · {sch.shift} ({sch.startTime}-{sch.endTime})
                </Tag>
            ) : <i className="text-muted-foreground text-xs">Chưa cài đặt</i>
        },
        {
            title: 'Khóa học',
            dataIndex: ['course', 'title'],
            key: 'course',
            render: (text: string) => text ? <Tag color="blue" className="rounded-full px-3">{text}</Tag> : <Tag className="rounded-full px-3 border-dashed bg-transparent text-muted-foreground">Chưa chọn</Tag>
        },
        {
            title: 'Giảng viên',
            dataIndex: ['teacher', 'username'],
            key: 'teacher',
            render: (text: string, record: Class) => record.teacher ? <span>{record.teacher.fullName || record.teacher.username}</span> : <Tag className="rounded-full px-3 border-dashed bg-transparent text-muted-foreground">Chưa gán</Tag>
        },
        {
            title: 'Giáo vụ',
            dataIndex: ['manager', 'username'],
            key: 'manager',
            render: (text: string, record: Class) => record.manager ? <Tag color="orange" className="rounded-full px-3">{record.manager.fullName || record.manager.username}</Tag> : <Tag className="rounded-full px-3 border-dashed bg-transparent text-muted-foreground">Chưa gán</Tag>
        },
        {
            title: 'Học viên',
            key: 'students',
            width: 100,
            render: (record: Class) => record._count?.enrollments || 0
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            render: (status: string) => {
                const st = getStatusConfig(classStatuses, status);
                return (
                    <Tag color={st.color} className="border-0 rounded-full px-3">
                        {st.label}
                    </Tag>
                );
            },
        },
        {
            title: 'Hành động',
            key: 'actions',
            width: 120,
            fixed: 'right' as const,
            align: 'center' as const,
            render: (_: any, record: Class) => {
                const canEdit = currentUser?.role === 'ADMIN' || currentUser?.role === 'HEAD_STAFF' || currentUser?.id === record.managerId;
                const menuItems = [
                    { key: 'view', icon: <EyeOutlined />, label: 'Xem chi tiết', onClick: () => navigate(currentUser?.role === 'STAFF' ? `/staff/class/${record.id}` : `/admin/class/${record.id}`) },
                    { key: 'students', icon: <TeamOutlined />, label: 'Quản lý học viên', onClick: () => handleManageStudents(record) },
                    ...(!['gathering', 'cancelled'].includes(record.status) ? [{ key: 'attendance', icon: <CalendarOutlined />, label: 'Điểm danh nhanh', onClick: () => openAttendanceModalFromTable(record) }] : []),
                    ...(canEdit ? [
                        { key: 'edit', icon: <EditOutlined />, label: 'Chỉnh sửa', onClick: () => handleEdit(record) },
                        ...(record.status === 'cancelled' ? [
                            { type: 'divider' as const },
                            { key: 'delete', icon: <DeleteOutlined />, label: 'Xóa', danger: true, onClick: () => handleDelete(record.id) }
                        ] : []),
                    ] : [])
                ];
                return (
                    <Dropdown menu={{ items: menuItems }} trigger={['hover']} placement="bottomRight">
                        <Button type="text" shape="circle" icon={<MoreOutlined style={{ fontSize: 20 }} />} />
                    </Dropdown>
                );
            },
        },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Lớp học</h1>
                        <p className="text-muted-foreground mt-1">Quản lý lịch học và vận hành các lớp học</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleAdd} className="rounded-lg shadow-md">
                        Mở lớp mới
                    </Button>
                </div>

                <Card className="border-0 shadow-sm rounded-xl">
                    <Form form={filterForm} layout="vertical" onFinish={handleSearch}>
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item name="title" label="Mã lớp học" className="mb-0">
                                    <Input placeholder="Tìm mã lớp..." prefix={<SearchOutlined className="text-muted-foreground" />} allowClear />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item name="courseId" label="Khóa học" className="mb-0">
                                    <Select showSearch placeholder="Chọn khóa học..." onSearch={(val) => handleSearchDebounced(val, 'course')} filterOption={false} allowClear>
                                        {courses.map(c => <Select.Option key={c.id} value={c.id}>{c.title}</Select.Option>)}
                                    </Select>
                                </Form.Item>
                            </Col>
                            {currentUser?.role !== 'STAFF' && (
                                <Col xs={24} sm={12} lg={6}>
                                    <Form.Item name="managerId" label="Giáo vụ phụ trách" className="mb-0">
                                        <Select showSearch placeholder="Chọn giáo vụ..." onSearch={(val) => handleSearchDebounced(val, 'manager')} filterOption={false} allowClear>
                                            {managers.map(m => <Select.Option key={m.id} value={m.id}>{m.fullName || m.username}</Select.Option>)}
                                        </Select>
                                    </Form.Item>
                                </Col>
                            )}
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item name="status" label="Trạng thái" className="mb-0" initialValue="all">
                                    <Select options={[
                                        { label: 'Tất cả', value: 'all' },
                                        ...Object.entries(classStatuses)
                                            .sort((a, b) => (a[1].order ?? 99) - (b[1].order ?? 99))
                                            .map(([value, cfg]) => ({ value, label: cfg.label }))
                                    ]} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} className="flex items-end justify-end mt-2">
                                <Space>
                                    <Button type="primary" htmlType="submit" icon={<SearchOutlined />} className="px-8 rounded-lg" loading={loading}>
                                        Tìm kiếm
                                    </Button>
                                    <Button icon={<ReloadOutlined />} onClick={handleReset} className="rounded-lg">
                                        Đặt lại
                                    </Button>
                                </Space>
                            </Col>
                        </Row>
                    </Form>
                </Card>

                <Card className="border-0 shadow-sm rounded-xl" styles={{ body: { padding: 0 } }}>
                    <Table
                        dataSource={classes}
                        columns={columns}
                        rowKey="id"
                        loading={loading}
                        pagination={{
                            current: currentPage,
                            pageSize: pageSize,
                            total: total,
                            showSizeChanger: true,
                            className: "p-4"
                        }}
                        scroll={{ x: 'max-content' }}
                        onChange={handleTableChange}
                    />
                </Card>

                <Drawer
                    title={editingClass ? 'Chỉnh sửa lớp học' : 'Mở lớp học mới'}
                    width={520}
                    onClose={() => setIsDrawerOpen(false)}
                    open={isDrawerOpen}
                    extra={
                        <Space>
                            <Button onClick={() => setIsDrawerOpen(false)}>Hủy</Button>
                            <Button type="primary" onClick={() => form.submit()} loading={loading}>
                                {editingClass ? 'Cập nhật' : 'Tạo mới'}
                            </Button>
                        </Space>
                    }
                >
                    <Form form={form} layout="vertical" onFinish={handleDrawerSubmit} className="mt-2">
                        <Form.Item name="title" label="Mã lớp học" rules={[{ required: true, message: 'Ví dụ: JAVA_K23_T24' }]}>
                            <Input placeholder="Nhập mã lớp học" />
                        </Form.Item>

                        <Form.Item label="Lịch học hàng tuần">
                            <div className="grid grid-cols-2 gap-3">
                                <Form.Item name="scheduleDays" noStyle>
                                    <Select
                                        mode="multiple"
                                        placeholder="Chọn thứ trong tuần..."
                                        options={scheduleMeta.days.map(d => ({ label: d.label, value: d.value }))}
                                        maxTagCount="responsive"
                                        onChange={handleScheduleDaysChange}
                                    />
                                </Form.Item>
                                <Form.Item name="scheduleShift" noStyle>
                                    <Select
                                        placeholder="Chọn ca học..."
                                        allowClear
                                        options={scheduleMeta.shifts.map(s => ({
                                            label: `${s.label} (${s.startTime}-${s.endTime})`,
                                            value: s.value,
                                        }))}
                                    />
                                </Form.Item>
                            </div>
                        </Form.Item>
                        <Form.Item name="scheduleNote" label="Ghi chú lịch học">
                            <Input placeholder="VD: Học bù thứ 7 mỗi tháng" />
                        </Form.Item>

                        <Form.Item name="courseId" label="Khóa học mẫu" rules={[{ required: true, message: 'Vui lòng chọn khóa học' }]}>
                            <Select
                                showSearch
                                placeholder="Tìm kiếm khóa học..."
                                onSearch={(val) => handleSearchDebounced(val, 'course')}
                                filterOption={false}
                                allowClear
                                onSelect={handleCourseSelect}
                                onClear={() => setSelectedCourse(null)}
                            >
                                {courses.map(c => (
                                    <Select.Option key={c.id} value={c.id}>
                                        <div className="flex justify-between items-center">
                                            <span>{c.title}</span>
                                            {c.lessonCount && (
                                                <span className="text-xs text-muted-foreground ml-2">{c.lessonCount} buổi</span>
                                            )}
                                        </div>
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        {selectedCourse?.lessonCount && (
                            <div className="-mt-3 mb-3 text-xs text-primary bg-primary/5 px-3 py-2 rounded-lg">
                                ℹ️ Khóa học này có <strong>{selectedCourse.lessonCount} buổi</strong>. Chọn lịch học và ngày khai giảng để tự tính ngày kết thúc.
                            </div>
                        )}

                        <Form.Item
                            noStyle
                            shouldUpdate={(prevValues, currentValues) => prevValues.status !== currentValues.status}
                        >
                            {({ getFieldValue }) => {
                                const currentStatus = getFieldValue('status');
                                const isTeacherRequired = ['active', 'finished'].includes(currentStatus);
                                return (
                                    <Form.Item
                                        name="teacherId"
                                        label="Giảng viên đứng lớp"
                                        rules={[{ required: isTeacherRequired, message: 'Vui lòng chọn giảng viên khi lớp Đang diễn ra' }]}
                                    >
                                        <Select showSearch placeholder="Tìm kiếm giảng viên..." onSearch={(val) => handleSearchDebounced(val, 'teacher')} filterOption={false} allowClear>
                                            {teachers.map(t => <Select.Option key={t.id} value={t.id}>{t.fullName || t.username}</Select.Option>)}
                                        </Select>
                                    </Form.Item>
                                );
                            }}
                        </Form.Item>

                        <Form.Item name="managerId" label="Giáo vụ quản lý" rules={[{ required: true, message: 'Vui lòng chọn giáo vụ quản lý' }]}>
                            <Select 
                                showSearch 
                                placeholder="Tìm kiếm giáo vụ..." 
                                onSearch={(val) => handleSearchDebounced(val, 'manager')} 
                                filterOption={false} 
                                allowClear
                                disabled={currentUser?.role === 'STAFF'}
                            >
                                {managers.map(m => <Select.Option key={m.id} value={m.id}>{m.fullName || m.username}</Select.Option>)}
                            </Select>
                        </Form.Item>

                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item
                                noStyle
                                shouldUpdate={(prevValues, currentValues) => prevValues.status !== currentValues.status}
                            >
                                {({ getFieldValue }) => {
                                    const currentStatus = getFieldValue('status');
                                    const isDateRequired = ['ready', 'active', 'finished'].includes(currentStatus);
                                    return (
                                        <Form.Item
                                            name="dates"
                                            label="Thời gian học"
                                            rules={[{ required: isDateRequired, message: 'Phải chọn thời gian khi lớp Sẵn sàng/Đang diễn ra' }]}
                                        >
                                            <RangePicker
                                                className="w-full"
                                                format="DD/MM/YYYY"
                                                disabledDate={(current) => current && current < dayjs().startOf('day')}
                                                onChange={handleStartDateChange}
                                                placeholder={['Ngày khai giảng', 'Ngày kết thúc']}
                                            />
                                        </Form.Item>
                                    );
                                }}
                            </Form.Item>
                            <Form.Item name="status" label="Trạng thái" initialValue="gathering">
                                <Select disabled={!editingClass} options={
                                    Object.entries(classStatuses)
                                        .sort((a, b) => (a[1].order ?? 99) - (b[1].order ?? 99))
                                        .map(([value, cfg]) => ({ value, label: cfg.label }))
                                } />
                            </Form.Item>
                        </div>
                    </Form>
                </Drawer>

                <Drawer
                    title={`Quản lý học viên - ${selectedClassForStudents?.title}`}
                    open={isStudentModalOpen}
                    onClose={() => setIsStudentModalOpen(false)}
                    width={1000}
                    placement="right"
                >
                    <Tabs defaultActiveKey="1" items={[
                        {
                            key: '1',
                            label: (<span><UserOutlined />Thêm thủ công</span>),
                            children: (
                    <div className="space-y-4 py-4">
                        <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-3">
                            <div className="flex items-center justify-between">
                                <Text strong className="text-slate-700">
                                    Thêm học viên vào lớp:
                                </Text>
                                {allStudents.length > 0 && (
                                    <Space size="small">
                                        {selectedStudentIdsToEnroll.length > 0 && (
                                            <Button 
                                                size="small" 
                                                type="text" 
                                                onClick={() => setSelectedStudentIdsToEnroll([])}
                                            >
                                                Bỏ chọn ({selectedStudentIdsToEnroll.length})
                                            </Button>
                                        )}
                                        <Button
                                            size="small"
                                            type="dashed"
                                            onClick={() => {
                                                const enrolledIds = new Set(classEnrollments.map((e: any) => e.student?.id));
                                                const notEnrolled = allStudents.filter(s => !enrolledIds.has(s.id));
                                                setSelectedStudentIdsToEnroll(notEnrolled.map(s => s.id));
                                            }}
                                        >
                                            Chọn tất cả học viên khả dụng
                                        </Button>
                                    </Space>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                                <Select
                                    mode="multiple"
                                    showSearch
                                    placeholder="Tìm kiếm và chọn nhiều học viên cùng lúc..."
                                    style={{ flex: 1 }}
                                    onSearch={(val) => handleSearchDebounced(val, 'student')}
                                    onChange={(vals) => setSelectedStudentIdsToEnroll(vals)}
                                    value={selectedStudentIdsToEnroll}
                                    loading={studentSearchLoading}
                                    filterOption={false}
                                    suffixIcon={<SearchOutlined />}
                                    notFoundContent={studentSearchLoading ? <Spin size="small" /> : 'Không tìm thấy học viên'}
                                    className="rounded-lg"
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
                                                        <Avatar size="small" icon={<UserOutlined />} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s.username}`} />
                                                        <span>{titleText}</span>
                                                        {s.email && titleText !== s.email && (
                                                            <span className="text-muted-foreground text-xs">({s.email})</span>
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
                                    className="shrink-0"
                                >
                                    Thêm vào lớp {selectedStudentIdsToEnroll.length > 0 ? `(${selectedStudentIdsToEnroll.length})` : ''}
                                </Button>
                            </div>
                        </div>

                        <List
                            loading={enrollmentLoading}
                            dataSource={classEnrollments}
                            header={<div className="font-bold text-lg">{classEnrollments.length} Học viên hiện tại</div>}
                            renderItem={(item) => (
                                <List.Item
                                    actions={[
                                        <Button key="remove" type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveStudent(item.id)}>
                                            Gỡ khỏi lớp
                                        </Button>
                                    ]}
                                >
                                    <List.Item.Meta
                                        avatar={
                                            <Avatar 
                                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.student?.username}`} 
                                                className="cursor-pointer hover:ring-2 ring-blue-500 transition-all shrink-0"
                                                onClick={() => {
                                                    setViewingStudent(item.student);
                                                    setStudentDetailOpen(true);
                                                }}
                                            />
                                        }
                                        title={
                                            <span 
                                                className="cursor-pointer font-bold text-slate-800 hover:text-blue-600 transition-colors flex items-center gap-1.5"
                                                onClick={() => {
                                                    setViewingStudent(item.student);
                                                    setStudentDetailOpen(true);
                                                }}
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
                            />
                        </div>
                            )
                        },
                        {
                            key: '2',
                            label: (<span><ImportOutlined />Import từ File</span>),
                            children: (
                                <div className="py-4">
                                    {selectedClassForStudents && (
                                        <StudentImport 
                                            classId={selectedClassForStudents.id} 
                                            onSuccess={() => fetchClassEnrollments(selectedClassForStudents.id)} 
                                        />
                                    )}
                                </div>
                            )
                        }
                    ]} />
                </Drawer>

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

const ManageClasses: React.FC = () => (
    <App>
        <ManageClassesContent />
    </App>
);

export default ManageClasses;
