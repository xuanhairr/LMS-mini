import React, { useState, useEffect } from 'react';
import {
    Modal,
    Tabs,
    Avatar,
    Tag,
    Spin,
    Card,
    Row,
    Col,
    Progress,
    Table,
    Typography,
    Empty,
    Space,
    Button,
    Tooltip,
    Divider,
    Descriptions,
    Badge
} from 'antd';
import {
    UserOutlined,
    MailOutlined,
    PhoneOutlined,
    CalendarOutlined,
    BookOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
    InfoCircleOutlined,
    GithubOutlined,
    TrophyOutlined,
    LineChartOutlined,
    FileTextOutlined,
    CopyOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiFetch } from '@/lib/api';

const { Title, Text, Paragraph } = Typography;

export interface StudentDetailModalProps {
    open: boolean;
    onClose: () => void;
    studentId?: string | null;
    initialStudent?: any | null;
    classId?: string | null;
    className?: string | null;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
    open,
    onClose,
    studentId,
    initialStudent,
    classId,
    className
}) => {
    const effectiveStudentId = studentId || initialStudent?.id;

    const [loading, setLoading] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(initialStudent || null);
    const [progressData, setProgressData] = useState<any>(null);
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [enrollmentsData, setEnrollmentsData] = useState<any[]>([]);
    const [classResult, setClassResult] = useState<any>(null);

    // Fetch data when modal opens
    useEffect(() => {
        if (!open || !effectiveStudentId) return;

        let isMounted = true;
        setLoading(true);

        const fetchAll = async () => {
            try {
                const promises: Promise<any>[] = [
                    // 1. User profile
                    apiFetch<any>(`/users/${effectiveStudentId}`).catch(() => ({ data: initialStudent })),
                    // 2. All enrollments of student
                    apiFetch<any>(`/enrollments?where[studentId][equals]=${effectiveStudentId}&include[class]=true`).catch(() => ({ data: [] }))
                ];

                // 3. Class-specific progress & attendance if classId is present
                if (classId) {
                    promises.push(
                        apiFetch<any>(`/classes/${classId}/progress/${effectiveStudentId}`).catch(() => ({ data: null })),
                        apiFetch<any>(`/attendance/my/${effectiveStudentId}?classId=${classId}`).catch(() => ({ data: [] })),
                        apiFetch<any>(`/grading/results/class/${classId}`).catch(() => ({ data: [] }))
                    );
                }

                const results = await Promise.all(promises);

                if (!isMounted) return;

                // Profile
                if (results[0]?.data) {
                    setUserProfile(results[0].data);
                } else if (initialStudent) {
                    setUserProfile(initialStudent);
                }

                // Enrollments
                const enrolls = Array.isArray(results[1]?.data) ? results[1].data : (results[1]?.data?.items || []);
                setEnrollmentsData(enrolls);

                // If classId
                if (classId) {
                    setProgressData(results[2]?.data || null);
                    const atts = Array.isArray(results[3]?.data) ? results[3].data : [];
                    setAttendanceData(atts);

                    const allResults = Array.isArray(results[4]?.data) ? results[4].data : [];
                    const myResult = allResults.find((r: any) => r.studentId === effectiveStudentId);
                    setClassResult(myResult || null);
                } else {
                    setProgressData(null);
                    setAttendanceData([]);
                    setClassResult(null);
                }
            } catch (err) {
                console.error('Lỗi khi tải thông tin học viên:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchAll();

        return () => {
            isMounted = false;
        };
    }, [open, effectiveStudentId, classId]);

    const studentName = userProfile?.fullName || userProfile?.username || initialStudent?.fullName || initialStudent?.username || 'Học viên';
    const studentUsername = userProfile?.username || initialStudent?.username || '';
    const studentEmail = userProfile?.email || initialStudent?.email || '';
    const studentPhone = userProfile?.phoneNumber || initialStudent?.phoneNumber || '';
    const studentAvatar = userProfile?.avatar || initialStudent?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${studentUsername || 'student'}`;

    // Attendance stats
    const totalAttendance = attendanceData.length;
    const presentCount = attendanceData.filter(a => a.status === 'present').length;
    const lateCount = attendanceData.filter(a => a.status === 'late').length;
    const excusedCount = attendanceData.filter(a => a.status === 'excused').length;
    const absentCount = attendanceData.filter(a => a.status === 'absent').length;
    const attendanceRate = totalAttendance > 0 ? Math.round(((presentCount + excusedCount * 0.5 + lateCount * 0.7) / totalAttendance) * 100) : 100;

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={[
                <Button key="close" type="primary" onClick={onClose}>
                    Đóng
                </Button>
            ]}
            width={840}
            centered
            destroyOnClose
            styles={{ body: { padding: '16px 24px 24px 24px' } }}
        >
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Spin size="large" />
                    <span className="mt-4 text-slate-500">Đang tải hồ sơ học viên...</span>
                </div>
            ) : (
                <div className="space-y-5">
                    {/* Header Banner & Profile Overview */}
                    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-800 rounded-xl p-5 text-white shadow-sm">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                            <Avatar
                                size={72}
                                src={studentAvatar}
                                icon={<UserOutlined />}
                                className="ring-4 ring-white/20 shadow-md bg-white/10 shrink-0"
                            />
                            <div className="flex-1 text-center sm:text-left space-y-1">
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                    <h2 className="text-xl font-bold text-white m-0">{studentName}</h2>
                                    <Tag color="cyan" className="rounded-full px-2.5 font-medium border-none bg-white/20 text-white">
                                        Học viên
                                    </Tag>
                                    {userProfile?.status === 'active' ? (
                                        <Tag color="success" className="rounded-full px-2.5 font-medium border-none bg-emerald-500/80 text-white">
                                            Hoạt động
                                        </Tag>
                                    ) : (
                                        <Tag color="default" className="rounded-full px-2.5 font-medium border-none bg-slate-500/80 text-white">
                                            Tạm khóa
                                        </Tag>
                                    )}
                                </div>

                                <div className="text-blue-100 text-sm">
                                    @{studentUsername}
                                </div>

                                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-y-1.5 gap-x-4 text-xs text-blue-100/90">
                                    <span className="flex items-center gap-1.5">
                                        <MailOutlined />
                                        {studentEmail || 'Chưa có email'}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <PhoneOutlined />
                                        {studentPhone || 'Chưa có số ĐT'}
                                    </span>
                                    {className && (
                                        <span className="flex items-center gap-1.5 bg-white/15 px-2 py-0.5 rounded text-white font-medium">
                                            <BookOutlined /> Lớp: {className}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Tabs */}
                    <Tabs
                        defaultActiveKey={classId ? "progress" : "enrollments"}
                        items={[
                            ...(classId ? [{
                                key: 'progress',
                                label: (
                                    <span className="flex items-center gap-1.5">
                                        <LineChartOutlined />
                                        Tiến độ & Bài tập
                                    </span>
                                ),
                                children: (
                                    <div className="space-y-4 pt-1">
                                        {/* Summary Stats Cards */}
                                        <Row gutter={[12, 12]}>
                                            <Col xs={12} sm={6}>
                                                <Card className="text-center bg-slate-50 border-slate-200 shadow-none">
                                                    <div className="text-xs text-slate-500 mb-1">Chuẩn bị bài</div>
                                                    <Progress
                                                        type="circle"
                                                        size={60}
                                                        percent={progressData?.summary?.preparationPercent || 0}
                                                        strokeColor="#f59e0b"
                                                    />
                                                    <div className="text-[11px] text-slate-400 mt-1">Video & Quiz</div>
                                                </Card>
                                            </Col>
                                            <Col xs={12} sm={6}>
                                                <Card className="text-center bg-slate-50 border-slate-200 shadow-none">
                                                    <div className="text-xs text-slate-500 mb-1">Nộp bài tập</div>
                                                    <Progress
                                                        type="circle"
                                                        size={60}
                                                        percent={progressData?.summary?.homeworkPercent || 0}
                                                        strokeColor="#3b82f6"
                                                    />
                                                    <div className="text-[11px] text-slate-400 mt-1">
                                                        {progressData?.summary?.submittedHomeworks || 0} bài đã nộp
                                                    </div>
                                                </Card>
                                            </Col>
                                            <Col xs={12} sm={6}>
                                                <Card className="text-center bg-slate-50 border-slate-200 shadow-none">
                                                    <div className="text-xs text-slate-500 mb-1">Chuyên cần</div>
                                                    <Progress
                                                        type="circle"
                                                        size={60}
                                                        percent={attendanceRate}
                                                        strokeColor={attendanceRate >= 80 ? '#10b981' : '#ef4444'}
                                                    />
                                                    <div className="text-[11px] text-slate-400 mt-1">
                                                        {presentCount}/{totalAttendance || '-'} buổi có mặt
                                                    </div>
                                                </Card>
                                            </Col>
                                            <Col xs={12} sm={6}>
                                                <Card className="text-center bg-slate-50 border-slate-200 shadow-none flex flex-col justify-center h-full">
                                                    <div className="text-xs text-slate-500 mb-1">Điểm tổng kết</div>
                                                    <div className="text-2xl font-bold" style={{ color: classResult?.isPassed ? '#10b981' : classResult?.totalScore ? '#ef4444' : '#64748b' }}>
                                                        {classResult?.totalScore !== null && classResult?.totalScore !== undefined
                                                            ? Number(classResult.totalScore).toFixed(1)
                                                            : '--'}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 mt-1">
                                                        {classResult ? (classResult.isPassed ? '✅ Đạt yêu cầu' : '❌ Chưa đạt') : 'Chưa tổng kết'}
                                                    </div>
                                                </Card>
                                            </Col>
                                        </Row>

                                        {/* Sessions and Homework breakdown */}
                                        <div className="mt-3">
                                            <div className="font-semibold text-slate-800 mb-2 flex items-center justify-between">
                                                <span>Chi tiết bài tập từng buổi học</span>
                                                <span className="text-xs font-normal text-slate-500">
                                                    Tổng cộng: {progressData?.sessions?.length || 0} buổi học
                                                </span>
                                            </div>

                                            {(!progressData?.sessions || progressData.sessions.length === 0) ? (
                                                <Empty description="Chưa có dữ liệu bài tập trong lớp học này" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                            ) : (
                                                <Table
                                                    dataSource={progressData.sessions}
                                                    rowKey="id"
                                                    size="small"
                                                    pagination={progressData.sessions.length > 6 ? { pageSize: 6 } : false}
                                                    className="border border-slate-200 rounded-lg overflow-hidden"
                                                    columns={[
                                                        {
                                                            title: 'Buổi',
                                                            dataIndex: 'sessionNumber',
                                                            width: 70,
                                                            align: 'center',
                                                            render: (num: number) => <Tag color="blue">B{num}</Tag>
                                                        },
                                                        {
                                                            title: 'Tên bài học',
                                                            dataIndex: 'title',
                                                            render: (text: string) => <span className="font-medium text-slate-800">{text}</span>
                                                        },
                                                        {
                                                            title: 'Tiến độ',
                                                            key: 'progress',
                                                            width: 140,
                                                            render: (_, record: any) => {
                                                                const count = record.submittedCount || 0;
                                                                const total = record.homeworks?.length || 0;
                                                                return (
                                                                    <div className="text-xs">
                                                                        <span className="font-medium">{count}/{total}</span> bài nộp
                                                                        {total > 0 && (
                                                                            <Progress percent={Math.round((count / total) * 100)} size="small" showInfo={false} />
                                                                        )}
                                                                    </div>
                                                                );
                                                            }
                                                        },
                                                        {
                                                            title: 'Trạng thái',
                                                            key: 'isCompleted',
                                                            width: 120,
                                                            align: 'center',
                                                            render: (_, record: any) => record.isCompleted ? (
                                                                <Tag color="success">Hoàn thành</Tag>
                                                            ) : (
                                                                <Tag color="default">Chưa hoàn thành</Tag>
                                                            )
                                                        }
                                                    ]}
                                                    expandable={{
                                                        expandedRowRender: (record: any) => {
                                                            if (!record.homeworks || record.homeworks.length === 0) {
                                                                return <div className="text-xs text-slate-400 py-2 px-4">Buổi này không có bài tập về nhà.</div>;
                                                            }
                                                            return (
                                                                <div className="bg-slate-50 p-3 rounded-lg space-y-2 border border-slate-200">
                                                                    <div className="text-xs font-semibold text-slate-700">Danh sách bài tập buổi này:</div>
                                                                    {record.homeworks.map((hw: any) => (
                                                                        <div key={hw.id} className="bg-white p-2.5 rounded border border-slate-200 text-xs flex flex-col gap-1.5">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="font-medium text-slate-800">
                                                                                    [{hw.level || 'BT'}] {hw.title}
                                                                                </span>
                                                                                {hw.status === 'graded' ? (
                                                                                    <Tag color="success">Đã chấm</Tag>
                                                                                ) : hw.status === 'submitted' ? (
                                                                                    <Tag color="blue">Đã nộp</Tag>
                                                                                ) : (
                                                                                    <Tag color="default">Chưa nộp</Tag>
                                                                                )}
                                                                            </div>
                                                                            {hw.githubLink && (
                                                                                <div className="flex items-center gap-1.5 text-blue-600">
                                                                                    <GithubOutlined />
                                                                                    <a href={hw.githubLink} target="_blank" rel="noreferrer" className="hover:underline">
                                                                                        {hw.githubLink}
                                                                                    </a>
                                                                                </div>
                                                                            )}
                                                                            {hw.teacherFeedback && (
                                                                                <div className="bg-amber-50 text-amber-800 p-2 rounded border border-amber-200 text-[11px]">
                                                                                    <span className="font-semibold">Nhận xét của GV:</span> {hw.teacherFeedback}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            );
                                                        }
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                )
                            }] : []),

                            ...(classId ? [{
                                key: 'attendance',
                                label: (
                                    <span className="flex items-center gap-1.5">
                                        <CheckCircleOutlined />
                                        Điểm danh ({presentCount}/{totalAttendance || 0})
                                    </span>
                                ),
                                children: (
                                    <div className="space-y-4 pt-1">
                                        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                            <div className="text-xs text-slate-600">
                                                Tổng số buổi đã điểm danh: <span className="font-bold text-slate-800">{totalAttendance}</span> buổi
                                            </div>
                                            <div className="flex items-center gap-3 text-xs">
                                                <span className="text-emerald-600 font-medium">✅ Có mặt: {presentCount}</span>
                                                <span className="text-amber-600 font-medium">⚠️ Muộn: {lateCount}</span>
                                                <span className="text-blue-600 font-medium">ℹ️ Có phép: {excusedCount}</span>
                                                <span className="text-rose-600 font-medium">❌ Vắng: {absentCount}</span>
                                            </div>
                                        </div>

                                        {attendanceData.length === 0 ? (
                                            <Empty description="Lớp này chưa có bản ghi điểm danh nào cho học viên" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                        ) : (
                                            <Table
                                                dataSource={attendanceData}
                                                rowKey="id"
                                                size="small"
                                                pagination={{ pageSize: 6 }}
                                                className="border border-slate-200 rounded-lg"
                                                columns={[
                                                    {
                                                        title: 'Buổi',
                                                        dataIndex: 'sessionNumber',
                                                        width: 80,
                                                        align: 'center',
                                                        render: (b: number) => <Tag color="blue">Buổi {b}</Tag>
                                                    },
                                                    {
                                                        title: 'Ngày học',
                                                        dataIndex: 'date',
                                                        render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm')
                                                    },
                                                    {
                                                        title: 'Trạng thái',
                                                        dataIndex: 'status',
                                                        width: 140,
                                                        render: (st: string) => {
                                                            if (st === 'present') return <Tag color="success">✅ Có mặt</Tag>;
                                                            if (st === 'late') return <Tag color="warning">⚠️ Đi muộn</Tag>;
                                                            if (st === 'excused') return <Tag color="blue">ℹ️ Có phép</Tag>;
                                                            return <Tag color="error">❌ Vắng mặt</Tag>;
                                                        }
                                                    },
                                                    {
                                                        title: 'Ghi chú',
                                                        dataIndex: 'note',
                                                        render: (note: string) => note || <span className="text-slate-400 italic">Không có ghi chú</span>
                                                    }
                                                ]}
                                            />
                                        )}
                                    </div>
                                )
                            }] : []),

                            {
                                key: 'enrollments',
                                label: (
                                    <span className="flex items-center gap-1.5">
                                        <BookOutlined />
                                        Các lớp tham gia ({enrollmentsData.length})
                                    </span>
                                ),
                                children: (
                                    <div className="space-y-3 pt-1">
                                        {enrollmentsData.length === 0 ? (
                                            <Empty description="Học viên chưa tham gia lớp học nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                        ) : (
                                            <Table
                                                dataSource={enrollmentsData}
                                                rowKey="id"
                                                size="small"
                                                pagination={{ pageSize: 5 }}
                                                className="border border-slate-200 rounded-lg"
                                                columns={[
                                                    {
                                                        title: 'Lớp học',
                                                        key: 'classTitle',
                                                        render: (_, rec: any) => (
                                                            <div>
                                                                <div className="font-semibold text-slate-800">
                                                                    {rec.class?.title || 'Lớp học'}
                                                                    {rec.classId === classId && (
                                                                        <Tag color="cyan" className="ml-2 text-[10px]">Hiện tại</Tag>
                                                                    )}
                                                                </div>
                                                                {rec.class?.startDate && (
                                                                    <div className="text-[11px] text-slate-400">
                                                                        Bắt đầu: {dayjs(rec.class.startDate).format('DD/MM/YYYY')}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    },
                                                    {
                                                        title: 'Ngày ghi danh',
                                                        dataIndex: 'createdAt',
                                                        width: 140,
                                                        render: (date: string) => dayjs(date).format('DD/MM/YYYY')
                                                    },
                                                    {
                                                        title: 'Tiến độ',
                                                        dataIndex: 'progress',
                                                        width: 160,
                                                        render: (prog: number) => (
                                                            <Progress percent={prog || 0} size="small" />
                                                        )
                                                    },
                                                    {
                                                        title: 'Trạng thái',
                                                        dataIndex: 'status',
                                                        width: 120,
                                                        render: (st: string) => (
                                                            <Tag color={st === 'active' ? 'success' : 'default'}>
                                                                {st === 'active' ? 'Đang học' : (st || 'Hoàn thành')}
                                                            </Tag>
                                                        )
                                                    }
                                                ]}
                                            />
                                        )}
                                    </div>
                                )
                            },

                            {
                                key: 'info',
                                label: (
                                    <span className="flex items-center gap-1.5">
                                        <InfoCircleOutlined />
                                        Hồ sơ tài khoản
                                    </span>
                                ),
                                children: (
                                    <div className="pt-2">
                                        <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
                                            <Descriptions.Item label="Mã học viên (ID)">
                                                <span className="font-mono text-xs">{effectiveStudentId}</span>
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Tên đăng nhập">
                                                <span className="font-semibold text-slate-800">@{studentUsername}</span>
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Họ và tên">
                                                {studentName}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Email">
                                                {studentEmail || 'Chưa cập nhật'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Số điện thoại">
                                                {studentPhone || 'Chưa cập nhật'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Vai trò">
                                                <Tag color="blue">STUDENT</Tag>
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Xác thực Email">
                                                {userProfile?.isEmailVerified ? (
                                                    <Tag color="success">Đã xác thực</Tag>
                                                ) : (
                                                    <Tag color="warning">Chưa xác thực</Tag>
                                                )}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Trạng thái tài khoản">
                                                {userProfile?.status === 'active' ? (
                                                    <Badge status="success" text="Đang hoạt động" />
                                                ) : (
                                                    <Badge status="error" text="Tạm ngưng" />
                                                )}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Ngày tạo tài khoản" span={2}>
                                                {userProfile?.createdAt ? dayjs(userProfile.createdAt).format('DD/MM/YYYY HH:mm:ss') : 'N/A'}
                                            </Descriptions.Item>
                                        </Descriptions>
                                    </div>
                                )
                            }
                        ]}
                    />
                </div>
            )}
        </Modal>
    );
};

export default StudentDetailModal;
