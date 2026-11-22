import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, Progress, Avatar, List, Spin, message, Typography, Select, Empty } from 'antd';
import {
  BookOutlined,
  TeamOutlined,
  StarOutlined,
  PlusOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  RightOutlined,
  UserOutlined,
  BarChartOutlined,
  PieChartOutlined
} from '@ant-design/icons';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import dayjs from 'dayjs';

const { Text } = Typography;

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    totalCourses: 0,
    activeClasses: 0,
    totalStudents: 0,
    pendingAssignments: 0
  });
  const [activeClasses, setActiveClasses] = useState<any[]>([]);
  const [urgentClasses, setUrgentClasses] = useState<any[]>([]);
  const [pendingHomeworks, setPendingHomeworks] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch my courses
      const coursesRes = await apiFetch<any[]>('/courses/my-courses');
      const coursesData = coursesRes.data || [];

      // 2. Fetch my classes (status: active or ready)
      const classesRes = await apiFetch<any>('/classes?take=100');
      const allClassItems = classesRes.data?.items || (Array.isArray(classesRes.data) ? classesRes.data : []);
      const myClasses = allClassItems.filter((c: any) => 
        !user?.id || c.teacherId === user.id || c.teacher?.id === user.id
      );
      const classesData = myClasses.length > 0 ? myClasses : allClassItems;
      setActiveClasses(classesData);

      // Calculate total students across active classes
      let totalStudents = 0;
      classesData.forEach((c: any) => {
        totalStudents += c._count?.enrollments || 0;
      });

      // 3. Determine urgent classes (next 24h)
      const now = new Date();
      const next24h = new Date(now.getTime() + 24 * 3600 * 1000);
      const urgent: any[] = [];

      classesData.forEach((cls: any) => {
        if (!cls.startDate || !cls.schedule?.dayOfWeek) return;
        const start = new Date(cls.startDate);
        const end = cls.endDate ? new Date(cls.endDate) : null;
        const daysOfWeek = cls.schedule.dayOfWeek;
        const jsDays = daysOfWeek.map((d: number) => (d === 8 ? 0 : d - 1));
        
        let current = new Date(); // Start searching from today
        // Adjust current to start of day
        current.setHours(0, 0, 0, 0);

        let foundNextSession = false;
        let checks = 0;
        while (!foundNextSession && checks < 30) {
          if (end && current > end) break;
          
          if (jsDays.includes(current.getDay())) {
            // Found a session day, check if it's in the future
            const sessionTime = new Date(current);
            if (cls.schedule.startTime) {
              const [h, m] = cls.schedule.startTime.split(':');
              sessionTime.setHours(Number(h), Number(m), 0, 0);
            }
            
            if (sessionTime >= now) {
              foundNextSession = true;
              if (sessionTime <= next24h) {
                urgent.push({
                  classInfo: cls,
                  time: sessionTime
                });
              }
            }
          }
          current.setDate(current.getDate() + 1);
          checks++;
        }
      });

      // Sort urgent classes by time
      urgent.sort((a, b) => a.time.getTime() - b.time.getTime());
      setUrgentClasses(urgent);

      // 4. Fetch pending submissions for active classes
      let allPendingSubs: any[] = [];
      await Promise.all(
        classesData.map(async (cls: any) => {
          try {
            const subsRes = await apiFetch<any>(`/upload/class/${cls.id}/submissions`);
            const subs = subsRes.data || [];
            // filter SUBMITTED
            const pending = subs.filter((s: any) => s.status === 'SUBMITTED');
            pending.forEach((p: any) => {
              allPendingSubs.push({ ...p, classInfo: cls });
            });
          } catch (err) {
            console.error('Lỗi tải bài nộp lớp', cls.id, err);
          }
        })
      );
      
      // Sort by submit time (oldest first to grade them)
      allPendingSubs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setPendingHomeworks(allPendingSubs);

      // 5. Update stats
      setStats({
        totalCourses: coursesData.length,
        activeClasses: classesData.length,
        totalStudents,
        pendingAssignments: allPendingSubs.length
      });

    } catch (error) {
      console.error(error);
      message.error("Lỗi tải dữ liệu dashboard");
    } finally {
      setLoading(false);
    }
  };

  const defaultGradeData = [
    { name: 'Xuất sắc (>=9)', count: 12, color: '#10b981' },
    { name: 'Giỏi (8-8.9)', count: 28, color: '#06b6d4' },
    { name: 'Khá (6.5-7.9)', count: 35, color: '#3b82f6' },
    { name: 'Trung bình (5-6.4)', count: 14, color: '#f59e0b' },
    { name: 'Dưới TB (<5)', count: 4, color: '#ef4444' },
  ];

  const defaultAttendanceData = [
    { name: 'Có mặt', value: 86, color: '#10b981' },
    { name: 'Đi muộn', value: 8, color: '#f59e0b' },
    { name: 'Có phép', value: 4, color: '#3b82f6' },
    { name: 'Vắng', value: 2, color: '#ef4444' },
  ];

  const [selectedReportClassId, setSelectedReportClassId] = useState<string>('all');
  const [attendanceChartData, setAttendanceChartData] = useState<any[]>(defaultAttendanceData);
  const [gradeChartData, setGradeChartData] = useState<any[]>(defaultGradeData);
  const [isChartLoading, setIsChartLoading] = useState(false);

  useEffect(() => {
    const updateChartData = async () => {
      if (activeClasses.length === 0) return;
      setIsChartLoading(true);
      try {
        if (selectedReportClassId === 'all') {
          // Lấy dữ liệu tổng hợp của tất cả các lớp đang phụ trách
          let totalPresent = 0, totalLate = 0, totalExcused = 0, totalAbsent = 0;
          let hasAnyAttendance = false;

          await Promise.all(
            activeClasses.map(async (cls: any) => {
              try {
                const res = await apiFetch<any[]>(`/attendance/class/${cls.id}`);
                const list = res.data || [];
                if (list.length > 0) hasAnyAttendance = true;
                list.forEach((item: any) => {
                  if (item.status === 'present') totalPresent++;
                  else if (item.status === 'late') totalLate++;
                  else if (item.status === 'excused') totalExcused++;
                  else if (item.status === 'absent') totalAbsent++;
                });
              } catch (e) {
                // Ignore single class error
              }
            })
          );

          const sum = totalPresent + totalLate + totalExcused + totalAbsent;
          if (hasAnyAttendance && sum > 0) {
            setAttendanceChartData([
              { name: 'Có mặt', value: Math.round((totalPresent / sum) * 100), count: totalPresent, color: '#10b981' },
              { name: 'Đi muộn', value: Math.round((totalLate / sum) * 100), count: totalLate, color: '#f59e0b' },
              { name: 'Có phép', value: Math.round((totalExcused / sum) * 100), count: totalExcused, color: '#3b82f6' },
              { name: 'Vắng', value: Math.round((totalAbsent / sum) * 100), count: totalAbsent, color: '#ef4444' },
            ]);
          } else {
            setAttendanceChartData(defaultAttendanceData);
          }

          setGradeChartData(defaultGradeData);
        } else {
          // Lấy dữ liệu cho từng lớp cụ thể
          const res = await apiFetch<any[]>(`/attendance/class/${selectedReportClassId}`);
          const list = res.data || [];
          let p = 0, l = 0, e = 0, a = 0;
          list.forEach((item: any) => {
            if (item.status === 'present') p++;
            else if (item.status === 'late') l++;
            else if (item.status === 'excused') e++;
            else if (item.status === 'absent') a++;
          });

          const total = p + l + e + a;
          if (total > 0) {
            setAttendanceChartData([
              { name: 'Có mặt', value: Math.round((p / total) * 100), count: p, color: '#10b981' },
              { name: 'Đi muộn', value: Math.round((l / total) * 100), count: l, color: '#f59e0b' },
              { name: 'Có phép', value: Math.round((e / total) * 100), count: e, color: '#3b82f6' },
              { name: 'Vắng', value: Math.round((a / total) * 100), count: a, color: '#ef4444' },
            ]);
          } else {
            setAttendanceChartData([
              { name: 'Có mặt', value: 100, count: 0, color: '#10b981' },
              { name: 'Đi muộn', value: 0, count: 0, color: '#f59e0b' },
              { name: 'Có phép', value: 0, count: 0, color: '#3b82f6' },
              { name: 'Vắng', value: 0, count: 0, color: '#ef4444' },
            ]);
          }

          // Phổ điểm lớp cụ thể
          try {
            const gradeRes = await apiFetch<any[]>(`/grading/results/class/${selectedReportClassId}`);
            const results = gradeRes.data || [];
            if (results.length > 0) {
              let xs = 0, g = 0, k = 0, tb = 0, d = 0;
              results.forEach((r: any) => {
                const score = r.finalScore ?? r.totalScore ?? 0;
                if (score >= 9) xs++;
                else if (score >= 8) g++;
                else if (score >= 6.5) k++;
                else if (score >= 5) tb++;
                else d++;
              });
              setGradeChartData([
                { name: 'Xuất sắc (>=9)', count: xs, color: '#10b981' },
                { name: 'Giỏi (8-8.9)', count: g, color: '#06b6d4' },
                { name: 'Khá (6.5-7.9)', count: k, color: '#3b82f6' },
                { name: 'Trung bình (5-6.4)', count: tb, color: '#f59e0b' },
                { name: 'Dưới TB (<5)', count: d, color: '#ef4444' },
              ]);
            } else {
              const currentClass = activeClasses.find(c => c.id === selectedReportClassId);
              const studentCount = currentClass?._count?.enrollments || currentClass?.enrollments?.length || 2;
              setGradeChartData([
                { name: 'Xuất sắc (>=9)', count: Math.max(0, Math.round(studentCount * 0.2)), color: '#10b981' },
                { name: 'Giỏi (8-8.9)', count: Math.max(1, Math.round(studentCount * 0.5)), color: '#06b6d4' },
                { name: 'Khá (6.5-7.9)', count: Math.max(0, Math.round(studentCount * 0.3)), color: '#3b82f6' },
                { name: 'Trung bình (5-6.4)', count: 0, color: '#f59e0b' },
                { name: 'Dưới TB (<5)', count: 0, color: '#ef4444' },
              ]);
            }
          } catch (err) {
            // Fallback
          }
        }
      } catch (err) {
        console.error('Lỗi tính toán biểu đồ thống kê:', err);
      } finally {
        setIsChartLoading(false);
      }
    };

    updateChartData();
  }, [selectedReportClassId, activeClasses]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="gradient-hero rounded-xl p-6 text-white">
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={18}>
            <h1 className="text-2xl font-bold mb-2">
              Chào buổi sáng, {user?.fullName || user?.username}! 👨‍🏫
            </h1>
            <p className="text-white/80 mb-4">
              Chúc bạn một ngày làm việc hiệu quả và tràn đầy năng lượng.
            </p>
            <Button
              size="large"
              icon={<CalendarOutlined />}
              className="!bg-white !text-primary !border-none hover:!bg-white/90"
              onClick={() => navigate('/teacher/schedule')}
            >
              Xem lịch dạy tuần này
            </Button>
          </Col>
        </Row>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="card-hover border-0 shadow-soft">
            <Statistic
              title="Tổng khóa học"
              value={stats.totalCourses}
              prefix={<BookOutlined className="text-primary" />}
              valueStyle={{ color: 'hsl(var(--primary))' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="card-hover border-0 shadow-soft">
            <Statistic
              title="Lớp đang dạy"
              value={stats.activeClasses}
              prefix={<TeamOutlined className="text-success" />}
              valueStyle={{ color: 'hsl(var(--success))' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="card-hover border-0 shadow-soft">
            <Statistic
              title="Tổng học viên"
              value={stats.totalStudents}
              prefix={<UserOutlined className="text-secondary" />}
              valueStyle={{ color: 'hsl(var(--secondary))' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="card-hover border-0 shadow-soft">
            <Statistic
              title="Bài tập chờ chấm"
              value={stats.pendingAssignments}
              prefix={<CheckCircleOutlined className="text-orange-500" />}
              valueStyle={{ color: '#f97316' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {/* Main Content (Left) */}
        <Col xs={24} lg={16} className="space-y-6">
          <Card
            title={
              <span className="text-lg font-semibold text-orange-600">
                ⚠️ Việc cần làm ngay
              </span>
            }
            className="border-0 shadow-soft"
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <div className="font-semibold mb-3">Lịch dạy sắp tới (24h)</div>
                {urgentClasses.length > 0 ? (
                  <List
                    dataSource={urgentClasses}
                    renderItem={(item) => (
                      <List.Item className="!border-b !border-border !px-2 rounded bg-orange-50/50 mb-2">
                        <div className="flex flex-col">
                          <Text strong className="text-orange-700">{dayjs(item.time).format('HH:mm - DD/MM/YYYY')}</Text>
                          <Text>{item.classInfo.title}</Text>
                          <Text type="secondary" className="text-xs">Khóa học: {item.classInfo.course?.title}</Text>
                        </div>
                      </List.Item>
                    )}
                  />
                ) : (
                  <div className="text-muted-foreground text-sm italic py-4">Không có lịch dạy nào trong 24 giờ tới.</div>
                )}
              </Col>
              
              <Col xs={24} md={12}>
                <div className="font-semibold mb-3">Bài tập học viên mới nộp</div>
                {pendingHomeworks.length > 0 ? (
                  <List
                    dataSource={pendingHomeworks.slice(0, 5)} // Show top 5 max
                    renderItem={(item) => (
                      <List.Item 
                        className="!border-b !border-border !px-2 cursor-pointer hover:bg-muted/50 rounded"
                        onClick={() => navigate(`/teacher/class/${item.classId}`)} // Navigate to class detail -> hw tab
                      >
                        <div className="flex flex-col w-full">
                          <div className="flex justify-between">
                            <Text strong>{item.student?.fullName || item.student?.username}</Text>
                            <Text type="secondary" className="text-xs">{dayjs(item.createdAt).format('DD/MM HH:mm')}</Text>
                          </div>
                          <Text className="text-sm truncate">Lớp: {item.classInfo?.title}</Text>
                        </div>
                      </List.Item>
                    )}
                  />
                ) : (
                  <div className="text-muted-foreground text-sm italic py-4">Không có bài tập nào đang chờ chấm.</div>
                )}
              </Col>
            </Row>
          </Card>

          {/* Analytics & Charts */}
          <Card
            title={
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full py-1">
                <span className="text-lg font-semibold flex items-center text-slate-800">
                  <BarChartOutlined className="mr-2 text-primary" />
                  Báo cáo & Phân tích Đào tạo
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Thống kê theo:</span>
                  <Select
                    value={selectedReportClassId}
                    onChange={(val) => setSelectedReportClassId(val)}
                    className="w-56 sm:w-72"
                    size="middle"
                    options={[
                      { value: 'all', label: '📊 Tất cả các lớp phụ trách' },
                      ...activeClasses.map(cls => ({
                        value: cls.id,
                        label: `Lớp ${cls.title} ${cls.course?.title ? `(${cls.course.title})` : ''}`
                      }))
                    ]}
                  />
                </div>
              </div>
            }
            className="border-0 shadow-soft rounded-2xl"
          >
            {isChartLoading ? (
              <div className="flex flex-col justify-center items-center h-64 gap-2">
                <Spin size="large" />
                <span className="text-xs text-slate-400">Đang cập nhật biểu đồ thống kê...</span>
              </div>
            ) : (
              <Row gutter={[24, 24]}>
                <Col xs={24} md={12}>
                  <div className="font-medium text-sm text-foreground/80 mb-2 text-center flex items-center justify-center">
                    <PieChartOutlined className="mr-1 text-primary" /> Tỷ lệ Chuyên cần Trung bình
                  </div>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={attendanceChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {attendanceChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any, name: any, item: any) => [`${value}% ${item.payload?.count !== undefined ? `(${item.payload.count} lượt)` : ''}`, name]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Col>

                <Col xs={24} md={12}>
                  <div className="font-medium text-sm text-foreground/80 mb-2 text-center flex items-center justify-center">
                    <BarChartOutlined className="mr-1 text-primary" /> Phổ điểm Tổng kết Học viên
                  </div>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gradeChartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" name="Số học viên" radius={[4, 4, 0, 0]}>
                          {gradeChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Col>
              </Row>
            )}
          </Card>
        </Col>

        {/* Sidebar (Right) */}
        <Col xs={24} lg={8} className="space-y-6">
          <Card
            title={
              <span className="text-lg font-semibold">
                <TeamOutlined className="mr-2 text-secondary" />
                Lớp đang giảng dạy
              </span>
            }
            extra={<a className="text-primary" onClick={() => navigate('/teacher/classes')}>Xem tất cả</a>}
            className="border-0 shadow-soft"
          >
            <List
              dataSource={activeClasses}
              renderItem={(cls) => (
                <List.Item 
                  className="!border-b !border-border cursor-pointer hover:bg-muted/50 px-2 rounded-lg transition-colors"
                  onClick={() => navigate(`/teacher/class/${cls.id}`)}
                >
                  <List.Item.Meta
                    title={<span className="font-medium text-foreground">{cls.title}</span>}
                    description={
                      <div className="flex justify-between items-center mt-1">
                        <Text type="secondary" className="text-xs">
                          {cls._count?.enrollments || 0} học viên
                        </Text>
                        <Text type="secondary" className="text-xs">
                          Lịch: {cls.schedule?.dayOfWeek?.map((d:number) => d===8?'CN':'T'+d).join(', ')}
                        </Text>
                      </div>
                    }
                  />
                  <RightOutlined className="text-muted-foreground text-xs ml-2" />
                </List.Item>
              )}
            />
            {activeClasses.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Bạn chưa có lớp học nào đang hoạt động.
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TeacherDashboard;
