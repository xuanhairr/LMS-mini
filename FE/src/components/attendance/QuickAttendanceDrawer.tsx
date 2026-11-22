import React, { useState, useEffect, useMemo } from 'react';
import { 
    Drawer, 
    Button, 
    Select, 
    Table, 
    Radio, 
    Input, 
    Tag, 
    Space, 
    Typography, 
    message, 
    Avatar, 
    Empty,
    Tooltip
} from 'antd';
import { 
    SearchOutlined, 
    CheckCircleOutlined, 
    CloseCircleOutlined, 
    UserOutlined, 
    InfoCircleOutlined,
    CheckOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiFetch } from '@/lib/api';
import { StudentDetailModal } from '@/components/student/StudentDetailModal';

const { Text } = Typography;

export interface QuickAttendanceDrawerProps {
    open: boolean;
    onClose: () => void;
    classData: any;
    onSuccess?: () => void;
    initialSessionNo?: number;
}

export const calculateSessionDates = (cls: any) => {
    if (!cls?.startDate || !cls?.schedule?.dayOfWeek) return [];
    const daysOfWeek = cls.schedule.dayOfWeek;
    if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) return [];
    const maxSessions = cls.sessionCount || cls.course?.lessonCount || 30;
    const dates: Date[] = [];
    const start = new Date(cls.startDate);
    const end = cls.endDate ? new Date(cls.endDate) : null;
    const jsDays = daysOfWeek.map((d: number) => (d === 8 ? 0 : d - 1));
    
    let current = new Date(start);
    let safetyCounter = 0;
    while (dates.length < maxSessions && safetyCounter < 1000) {
        safetyCounter++;
        if (end && current > end) break;
        if (jsDays.includes(current.getDay())) {
            dates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
    }
    return dates;
};

export const QuickAttendanceDrawer: React.FC<QuickAttendanceDrawerProps> = ({
    open,
    onClose,
    classData,
    onSuccess,
    initialSessionNo
}) => {
    const [sessionNo, setSessionNo] = useState<number | undefined>(initialSessionNo || 1);
    const [attendanceList, setAttendanceList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Search & Filter state for 100+ students
    const [searchText, setSearchText] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Student detail modal
    const [viewingStudent, setViewingStudent] = useState<any>(null);
    const [studentDetailOpen, setStudentDetailOpen] = useState(false);

    // Session options calculation
    const sessionDates = useMemo(() => {
        if (!classData) return [];
        return calculateSessionDates(classData);
    }, [classData]);

    const sessionOptions = useMemo(() => {
        if (!classData) return [];
        if (sessionDates.length > 0) {
            return sessionDates.map((date, i) => ({
                value: i + 1,
                label: `Buổi ${i + 1} (${dayjs(date).format('DD/MM/YYYY')})`
            }));
        }
        const length = classData.sessionCount || classData.course?.lessonCount || 30;
        return Array.from({ length }, (_, i) => ({ value: i + 1, label: `Buổi ${i + 1}` }));
    }, [classData, sessionDates]);

    // Fetch attendance when drawer opens or sessionNo changes
    const fetchAttendance = async (sNo: number) => {
        if (!classData?.id) return;
        setLoading(true);
        try {
            // 1. Fetch class enrollments
            const enrollRes = await apiFetch<any>(`/enrollments?where[class][id][equals]=${classData.id}&include[student]=true`);
            const rawEnrollments = enrollRes.data?.items || (Array.isArray(enrollRes.data) ? enrollRes.data : []);
            
            // Deduplicate students
            const studentMap = new Map<string, any>();
            rawEnrollments.forEach((e: any) => {
                if (e.student?.id && !studentMap.has(e.student.id)) {
                    studentMap.set(e.student.id, e.student);
                }
            });
            const students = Array.from(studentMap.values());

            // 2. Fetch saved attendance for this session
            const res = await apiFetch<any>(`/attendance/class/${classData.id}/session/${sNo}`);
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
        } catch (err: any) {
            message.error('Lỗi khi tải danh sách điểm danh: ' + (err?.message || 'Lỗi hệ thống'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && classData?.id) {
            const currentSession = sessionNo || 1;
            setSessionNo(currentSession);
            fetchAttendance(currentSession);
        }
    }, [open, classData?.id]);

    const handleSessionChange = (newSessionNo: number) => {
        setSessionNo(newSessionNo);
        fetchAttendance(newSessionNo);
    };

    const handleStatusChange = (studentId: string, status: string) => {
        setAttendanceList(prev => prev.map(item => 
            item.studentId === studentId ? { ...item, status } : item
        ));
    };

    const handleNoteChange = (studentId: string, note: string) => {
        setAttendanceList(prev => prev.map(item => 
            item.studentId === studentId ? { ...item, note } : item
        ));
    };

    // Quick batch actions
    const markAllStatus = (status: 'present' | 'absent' | 'late' | 'excused') => {
        setAttendanceList(prev => prev.map(item => ({ ...item, status })));
        const statusLabels: Record<string, string> = {
            present: 'Có mặt',
            absent: 'Vắng',
            late: 'Đi muộn',
            excused: 'Có phép'
        };
        message.info(`Đã đánh dấu tất cả là: ${statusLabels[status]}`);
    };

    // Save attendance
    const handleSave = async () => {
        if (!classData?.id || !sessionNo) return;
        setSaving(true);
        try {
            await apiFetch(`/attendance/batch`, {
                method: 'POST',
                body: JSON.stringify({
                    classId: classData.id,
                    sessionNumber: sessionNo,
                    date: new Date(),
                    records: attendanceList.map(a => ({
                        studentId: a.studentId,
                        status: a.status,
                        note: a.note
                    }))
                })
            });
            message.success('Đã lưu điểm danh thành công!');
            onSuccess?.();
            onClose();
        } catch (err: any) {
            message.error('Lưu điểm danh thất bại: ' + (err?.message || 'Vui lòng thử lại'));
        } finally {
            setSaving(false);
        }
    };

    // Filter students by search text and status
    const filteredList = useMemo(() => {
        const query = searchText.toLowerCase().trim();
        return attendanceList.filter(item => {
            const student = item.student;
            const matchesSearch = !query || 
                (student?.fullName || '').toLowerCase().includes(query) ||
                (student?.username || '').toLowerCase().includes(query) ||
                (student?.email || '').toLowerCase().includes(query);

            const matchesStatus = filterStatus === 'all' || item.status === filterStatus;

            return matchesSearch && matchesStatus;
        });
    }, [attendanceList, searchText, filterStatus]);

    // Counters for quick stats
    const counts = useMemo(() => {
        let present = 0, late = 0, excused = 0, absent = 0;
        attendanceList.forEach(item => {
            if (item.status === 'present') present++;
            else if (item.status === 'late') late++;
            else if (item.status === 'excused') excused++;
            else if (item.status === 'absent') absent++;
        });
        return { present, late, excused, absent, total: attendanceList.length };
    }, [attendanceList]);

    return (
        <>
            <Drawer
                title={
                    <div className="flex items-center justify-between pr-4">
                        <span className="font-bold text-base text-slate-800">
                            Điểm danh nhanh - {classData?.title}
                        </span>
                    </div>
                }
                placement="right"
                onClose={onClose}
                open={open}
                width={860}
                extra={
                    <Button 
                        type="primary" 
                        icon={<CheckOutlined />}
                        onClick={handleSave} 
                        loading={saving} 
                        disabled={!sessionNo || loading}
                        className="bg-emerald-600 hover:bg-emerald-700 font-medium"
                    >
                        Lưu điểm danh
                    </Button>
                }
            >
                <div className="space-y-4">
                    {/* Header Controls: Buổi học + Batch Actions */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <Text strong className="whitespace-nowrap text-slate-700">Chọn buổi học:</Text>
                                <Select 
                                    placeholder="Chọn buổi học..." 
                                    value={sessionNo} 
                                    onChange={handleSessionChange}
                                    style={{ width: 240 }}
                                    className="rounded-lg shadow-sm"
                                    options={sessionOptions}
                                />
                            </div>

                            {/* Batch quick-mark buttons */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Đánh dấu nhanh:</span>
                                <Button 
                                    size="small" 
                                    icon={<CheckCircleOutlined className="text-emerald-600" />}
                                    onClick={() => markAllStatus('present')}
                                    className="text-xs font-medium border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                                >
                                    Tất cả Có mặt
                                </Button>
                                <Button 
                                    size="small" 
                                    icon={<CloseCircleOutlined className="text-red-500" />}
                                    onClick={() => markAllStatus('absent')}
                                    className="text-xs font-medium border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                                >
                                    Tất cả Vắng
                                </Button>
                            </div>
                        </div>

                        {/* Search Input for classes with 100+ students */}
                        <div className="pt-2 border-t border-slate-200/60">
                            <Input
                                placeholder="🔍 Tìm kiếm học viên theo họ tên, email hoặc tài khoản..."
                                prefix={<SearchOutlined className="text-slate-400" />}
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                allowClear
                                size="middle"
                                className="rounded-xl shadow-inner w-full"
                            />
                        </div>

                        {/* Status filter pills */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                            <div className="flex items-center gap-1.5 overflow-x-auto">
                                <button
                                    type="button"
                                    onClick={() => setFilterStatus('all')}
                                    className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                                        filterStatus === 'all'
                                            ? 'bg-slate-800 text-white shadow-sm'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    Tất cả ({counts.total})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilterStatus('present')}
                                    className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                                        filterStatus === 'present'
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                                    }`}
                                >
                                    Có mặt ({counts.present})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilterStatus('late')}
                                    className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                                        filterStatus === 'late'
                                            ? 'bg-amber-500 text-white shadow-sm'
                                            : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
                                    }`}
                                >
                                    Đi muộn ({counts.late})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilterStatus('excused')}
                                    className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                                        filterStatus === 'excused'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
                                    }`}
                                >
                                    Có phép ({counts.excused})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilterStatus('absent')}
                                    className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                                        filterStatus === 'absent'
                                            ? 'bg-red-600 text-white shadow-sm'
                                            : 'bg-white text-red-700 border border-red-200 hover:bg-red-50'
                                    }`}
                                >
                                    Vắng ({counts.absent})
                                </button>
                            </div>

                            <span className="text-slate-400 font-medium">
                                Hiển thị: <strong className="text-slate-700">{filteredList.length}</strong> / {attendanceList.length} học viên
                            </span>
                        </div>
                    </div>

                    {/* Table of students */}
                    <Table
                        dataSource={filteredList}
                        loading={loading}
                        rowKey="studentId"
                        pagination={false}
                        className="border border-slate-200 rounded-xl overflow-hidden shadow-sm"
                        locale={{
                            emptyText: (
                                <Empty 
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={searchText ? "Không tìm thấy học viên nào phù hợp với từ khóa" : "Chưa có học viên nào trong lớp"}
                                />
                            )
                        }}
                        columns={[
                            {
                                title: 'Học viên',
                                dataIndex: 'student',
                                width: 230,
                                render: (student: any) => (
                                    <div 
                                        className="flex items-center gap-2.5 cursor-pointer group py-0.5 select-none"
                                        onClick={() => {
                                            setViewingStudent(student);
                                            setStudentDetailOpen(true);
                                        }}
                                        title="Nhấn để xem hồ sơ học viên"
                                    >
                                        <Avatar 
                                            src={student?.avatar} 
                                            icon={<UserOutlined />} 
                                            className="group-hover:ring-2 ring-blue-500 transition-all shrink-0" 
                                            size="small"
                                        />
                                        <div className="overflow-hidden">
                                            <div className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-1 truncate text-sm">
                                                {student?.fullName || student?.username}
                                                <InfoCircleOutlined className="text-xs text-blue-400 shrink-0" />
                                            </div>
                                            <div className="text-[11px] text-slate-400 truncate">
                                                {student?.email || `@${student?.username}`}
                                            </div>
                                        </div>
                                    </div>
                                ),
                            },
                            {
                                title: 'Trạng thái',
                                key: 'status',
                                width: 340,
                                render: (_, record) => (
                                    <Radio.Group 
                                        value={record.status} 
                                        size="middle"
                                        onChange={(e) => handleStatusChange(record.studentId, e.target.value)}
                                        className="flex flex-wrap items-center gap-1"
                                    >
                                        <Radio value="present" className="mr-1">
                                            <Tag color="green" className="m-0 font-medium">Có mặt</Tag>
                                        </Radio>
                                        <Radio value="late" className="mr-1">
                                            <Tag color="orange" className="m-0 font-medium">Đi muộn</Tag>
                                        </Radio>
                                        <Radio value="excused" className="mr-1">
                                            <Tag color="blue" className="m-0 font-medium">Có phép</Tag>
                                        </Radio>
                                        <Radio value="absent" className="m-0">
                                            <Tag color="red" className="m-0 font-medium">Vắng</Tag>
                                        </Radio>
                                    </Radio.Group>
                                )
                            },
                            {
                                title: 'Ghi chú',
                                key: 'note',
                                render: (_, record) => (
                                    <Input 
                                        placeholder="Ghi chú (lý do muộn/vắng...)" 
                                        value={record.note}
                                        onChange={(e) => handleNoteChange(record.studentId, e.target.value)}
                                        className="rounded-lg text-xs"
                                        allowClear
                                    />
                                )
                            }
                        ]}
                    />
                </div>
            </Drawer>

            <StudentDetailModal
                open={studentDetailOpen}
                onClose={() => setStudentDetailOpen(false)}
                studentId={viewingStudent?.id}
                initialStudent={viewingStudent}
                classId={classData?.id}
                className={classData?.title}
            />
        </>
    );
};
