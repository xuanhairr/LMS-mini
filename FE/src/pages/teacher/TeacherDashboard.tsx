import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, Progress, Avatar, List, Spin, message, Typography } from 'antd';
import {
  BookOutlined,
  TeamOutlined,
  StarOutlined,
  PlusOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  RightOutlined,
  UserOutlined
} from '@ant-design/icons';
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

      // 2. Fetch my active classes (status: active or ready)
      const classesRes = await apiFetch<any>('/classes?where[status]=active');
      const classesData = classesRes.data?.items || [];
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
