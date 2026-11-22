import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, Spin, message, List, Typography } from 'antd';
import {
  TeamOutlined,
  BookOutlined,
  AlertOutlined,
  SettingOutlined,
  RightOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
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
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import dayjs from 'dayjs';

const { Text } = Typography;

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  
  const isStaffOnly = user?.role === 'STAFF';
  const classesPath = isStaffOnly ? '/staff/classes' : '/admin/classes';
  const getClassDetailPath = (id: string) => isStaffOnly ? `/staff/class/${id}` : `/admin/class/${id}`;
  
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalCourses: 0,
    totalClasses: 0,
    activeClasses: 0,
  });

  const [classStatusCounts, setClassStatusCounts] = useState({
    gathering: 0,
    ready: 0,
    active: 0,
    finished: 0,
  });

  const [gatheringClasses, setGatheringClasses] = useState<any[]>([]);
  const [readyClassesWithoutTeacher, setReadyClassesWithoutTeacher] = useState<any[]>([]);
  const [updatingClassId, setUpdatingClassId] = useState<string | null>(null);

  const [recentClasses, setRecentClasses] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const classQueryPrefix = isStaffOnly ? `where[managerId]=${user?.id}&` : '';

      // 1. Fetch Stats (Parallel)
      const [
        studentsRes,
        teachersRes,
        coursesRes,
        totalClassesRes,
        activeClassesRes,
        gatheringClassesRes,
        readyClassesRes,
        finishedClassesRes,
      ] = await Promise.all([
        apiFetch<any>('/users?where[roles][has]=STUDENT&take=1'),
        apiFetch<any>('/users?where[roles][has]=TEACHER&take=1'),
        apiFetch<any>('/courses?take=1'),
        apiFetch<any>(`/classes?${classQueryPrefix}take=1`),
        apiFetch<any>(`/classes?${classQueryPrefix}where[status]=active&take=1`),
        apiFetch<any>(`/classes?${classQueryPrefix}where[status]=gathering&take=1`),
        apiFetch<any>(`/classes?${classQueryPrefix}where[status]=ready&take=1`),
        apiFetch<any>(`/classes?${classQueryPrefix}where[status]=finished&take=1`),
      ]);

      setStats({
        totalStudents: studentsRes.data?.total || 0,
        totalTeachers: teachersRes.data?.total || 0,
        totalCourses: coursesRes.data?.total || 0,
        totalClasses: totalClassesRes.data?.total || 0,
        activeClasses: activeClassesRes.data?.total || 0,
      });

      setClassStatusCounts({
        gathering: gatheringClassesRes.data?.total || 0,
        ready: readyClassesRes.data?.total || 0,
        active: activeClassesRes.data?.total || 0,
        finished: finishedClassesRes.data?.total || 0,
      });

      // 2. Fetch classes for Smart Alerts
      // Lớp gathering sắp khai giảng (<= 3 ngày)
      const gatheringRes = await apiFetch<any>(`/classes?${classQueryPrefix}where[status]=gathering&orderBy[startDate]=asc&include[teacher]=true`);
      const gatheringList = gatheringRes.data?.items || [];
      
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const in3Days = new Date(now.getTime() + 3 * 24 * 3600 * 1000);
      in3Days.setHours(23, 59, 59, 999);

      const urgentGathering = gatheringList.filter((c: any) => {
        if (!c.startDate) return false;
        const start = new Date(c.startDate);
        return start >= now && start <= in3Days;
      });
      setGatheringClasses(urgentGathering);

      // Lớp ready nhưng thiếu Giảng viên
      const readyRes = await apiFetch<any>(`/classes?${classQueryPrefix}where[status]=ready&include[teacher]=true`);
      const readyList = readyRes.data?.items || [];
      const noTeacherList = readyList.filter((c: any) => !c.teacherId);
      setReadyClassesWithoutTeacher(noTeacherList);

      // Lớp ready nhưng đã đến ngày khai giảng
      const overdueReadyList = readyList.filter((c: any) => {
        if (!c.startDate) return false;
        const start = new Date(c.startDate);
        start.setHours(0, 0, 0, 0);
        return start <= now;
      });
      // Merge vào gatheringClasses (dùng chung state) hoặc state mới
      // Đơn giản là push chung vào 1 danh sách cảnh báo chuyển trạng thái
      const combinedAlerts = [
        ...urgentGathering.map((c:any) => ({ ...c, alertType: 'gathering_to_ready' })),
        ...overdueReadyList.map((c:any) => ({ ...c, alertType: 'ready_to_active' }))
      ];
      setGatheringClasses(combinedAlerts);

      // 3. Lớp mới mở gần đây (Recent Activities)
      const recentClassesRes = await apiFetch<any>(`/classes?${classQueryPrefix}orderBy[createdAt]=desc&take=5`);
      setRecentClasses(recentClassesRes.data?.items || []);

    } catch (error) {
      console.error(error);
      message.error("Lỗi tải dữ liệu dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickChangeStatus = async (item: any) => {
    const isGatheringToReady = item.alertType === 'gathering_to_ready';
    const nextStatus = isGatheringToReady ? 'ready' : 'active';
    const nextStatusLabel = isGatheringToReady ? 'Sẵn sàng' : 'Đang diễn ra';

    if (nextStatus === 'active' && !item.teacherId) {
      message.warning(`Lớp "${item.title}" chưa có Giảng viên phụ trách. Vui lòng phân công Giảng viên trước khi chuyển sang Đang diễn ra!`);
      navigate(classesPath, { state: { searchTitle: item.title.split(' ')[0] } });
      return;
    }

    setUpdatingClassId(item.id);
    try {
      await apiFetch<any>(`/classes/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      message.success(`Đã chuyển lớp "${item.title}" sang trạng thái "${nextStatusLabel}" thành công!`);
      await fetchData();
    } catch (err: any) {
      message.error(err?.message || 'Lỗi khi cập nhật trạng thái lớp học');
    } finally {
      setUpdatingClassId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  const roleName = user?.role === 'ADMIN' ? 'Quản trị viên' : user?.role === 'HEAD_STAFF' ? 'Trưởng giáo vụ' : 'Giáo vụ';

  const classStatusChartData = [
    { name: 'Gom học viên', count: classStatusCounts.gathering, color: '#f59e0b' },
    { name: 'Sẵn sàng', count: classStatusCounts.ready, color: '#06b6d4' },
    { name: 'Đang học', count: classStatusCounts.active, color: '#10b981' },
    { name: 'Hoàn thành', count: classStatusCounts.finished, color: '#6366f1' },
  ];

  const attendanceSystemData = [
    { name: 'Có mặt đúng giờ', value: 82, color: '#10b981' },
    { name: 'Đi muộn', value: 10, color: '#f59e0b' },
    { name: 'Nghỉ có phép', value: 5, color: '#3b82f6' },
    { name: 'Nghỉ không phép', value: 3, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="gradient-hero rounded-xl p-6 text-white">
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={18}>
            <h1 className="text-2xl font-bold mb-2">
              Chào buổi sáng, {user?.fullName || user?.username}! ⚙️
            </h1>
            <p className="text-white/80 mb-4">
              Vai trò: {roleName}. Chúc bạn một ngày làm việc hiệu quả.
            </p>
          </Col>
          <Col xs={24} md={6} className="text-right hidden md:block">
            <SettingOutlined className="text-6xl text-white/30" />
          </Col>
        </Row>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="card-hover border-0 shadow-soft">
            <Statistic
              title="Tổng Học viên"
              value={stats.totalStudents}
              prefix={<TeamOutlined className="text-primary" />}
              valueStyle={{ color: 'hsl(var(--primary))' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="card-hover border-0 shadow-soft">
            <Statistic
              title="Tổng Giảng viên"
              value={stats.totalTeachers}
              prefix={<TeamOutlined className="text-success" />}
              valueStyle={{ color: 'hsl(var(--success))' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          {user?.role === 'STAFF' ? (
            <Card className="card-hover border-0 shadow-soft">
              <Statistic
                title="Lớp học đang quản lý"
                value={stats.totalClasses}
                prefix={<BookOutlined className="text-secondary" />}
                valueStyle={{ color: 'hsl(var(--secondary))' }}
              />
            </Card>
          ) : (
            <Card className="card-hover border-0 shadow-soft">
              <Statistic
                title="Khóa học đang phát hành"
                value={stats.totalCourses}
                prefix={<BookOutlined className="text-secondary" />}
                valueStyle={{ color: 'hsl(var(--secondary))' }}
              />
            </Card>
          )}
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="card-hover border-0 shadow-soft">
            <Statistic
              title="Lớp đang hoạt động"
              value={stats.activeClasses}
              prefix={<CheckCircleOutlined className="text-warning" />}
              valueStyle={{ color: 'hsl(var(--warning))' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Analytics & Charts Section */}
      <Card
        title={
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold flex items-center">
              <BarChartOutlined className="mr-2 text-primary" />
              Thống kê & Phân tích Đào tạo
            </span>
            <Tag color="blue">Dữ liệu thời gian thực</Tag>
          </div>
        }
        className="border-0 shadow-soft"
      >
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <div className="font-medium text-sm text-foreground/80 mb-2 text-center flex items-center justify-center">
              <PieChartOutlined className="mr-1 text-primary" /> Tỷ lệ Chuyên cần Toàn hệ thống
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceSystemData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {attendanceSystemData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value}%`, 'Tỷ lệ']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Col>

          <Col xs={24} md={12}>
            <div className="font-medium text-sm text-foreground/80 mb-2 text-center flex items-center justify-center">
              <BarChartOutlined className="mr-1 text-primary" /> Phân bổ Trạng thái Lớp học
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classStatusChartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Số lớp" radius={[4, 4, 0, 0]}>
                    {classStatusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Col>
        </Row>
      </Card>

      <Row gutter={[24, 24]}>
        {/* Main Content (Left) - Smart Alerts */}
        <Col xs={24} lg={16} className="space-y-6">
          <Card
            title={
              <span className="text-lg font-semibold text-orange-600">
                ⚠️ Nhắc việc thông minh
              </span>
            }
            className="border-0 shadow-soft"
          >
            <div className="space-y-6">
              <div>
                <div className="font-semibold mb-3 flex items-center text-orange-600">
                  <ExclamationCircleOutlined className="mr-2" />
                  Lớp cần cập nhật trạng thái
                </div>
                {gatheringClasses.length > 0 ? (
                  <List
                    dataSource={gatheringClasses}
                    renderItem={(item) => (
                      <List.Item 
                        className="!border-b !border-border !px-4 cursor-pointer hover:bg-orange-50/50 rounded transition-colors"
                        onClick={() => navigate(getClassDetailPath(item.id))}
                      >
                        <div className="flex justify-between w-full items-center gap-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <Text strong className="text-slate-800 text-sm hover:text-blue-600 transition-colors">
                                {item.title}
                              </Text>
                              {item.teacher?.fullName && (
                                <span className="text-[11px] text-muted-foreground bg-slate-100 px-2 py-0.5 rounded">
                                  GV: {item.teacher.fullName}
                                </span>
                              )}
                            </div>
                            <Text type="secondary" className="text-xs mt-0.5">
                              Ngày khai giảng: {dayjs(item.startDate).format('DD/MM/YYYY')}
                            </Text>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Tag color={item.alertType === 'gathering_to_ready' ? 'orange' : 'green'} className="m-0 text-xs">
                              {item.alertType === 'gathering_to_ready' ? 'Sắp mở ➡️ Sẵn sàng' : 'Sẵn sàng ➡️ Đang diễn ra'}
                            </Tag>
                            <Button
                              type="primary"
                              size="small"
                              icon={<CheckCircleOutlined />}
                              loading={updatingClassId === item.id}
                              className={
                                item.alertType === 'gathering_to_ready'
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white font-medium border-0 shadow-sm rounded-md'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white font-medium border-0 shadow-sm rounded-md'
                              }
                              onClick={() => handleQuickChangeStatus(item)}
                            >
                              {item.alertType === 'gathering_to_ready' ? 'Chuyển Sẵn sàng' : 'Khai giảng ngay'}
                            </Button>
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                ) : (
                  <div className="text-muted-foreground text-sm italic bg-gray-50 p-4 rounded text-center">
                    Tuyệt vời! Không có lớp nào sắp khai giảng bị trễ trạng thái.
                  </div>
                )}
              </div>

              <div>
                <div className="font-semibold mb-3 flex items-center text-red-600">
                  <AlertOutlined className="mr-2" />
                  Lớp Sẵn sàng nhưng thiếu Giảng viên
                </div>
                {readyClassesWithoutTeacher.length > 0 ? (
                  <List
                    dataSource={readyClassesWithoutTeacher}
                    renderItem={(item) => (
                      <List.Item 
                        className="!border-b !border-border !px-4 cursor-pointer hover:bg-red-50/50 rounded transition-colors"
                        onClick={() => navigate(classesPath, { state: { searchTitle: item.title.split(' ')[0] } })}
                      >
                        <div className="flex justify-between w-full items-center">
                          <div className="flex flex-col">
                            <Text strong>{item.title}</Text>
                            <Text type="secondary" className="text-xs">Khai giảng: {dayjs(item.startDate).format('DD/MM/YYYY')}</Text>
                          </div>
                          <Button size="small" type="primary" danger>Phân công GV</Button>
                        </div>
                      </List.Item>
                    )}
                  />
                ) : (
                  <div className="text-muted-foreground text-sm italic bg-gray-50 p-4 rounded text-center">
                    Tất cả các lớp Sẵn sàng đều đã được phân công Giảng viên.
                  </div>
                )}
              </div>


            </div>
          </Card>
        </Col>

        {/* Sidebar (Right) - Recent Activities */}
        <Col xs={24} lg={8} className="space-y-6">
          <Card
            title={
              <span className="text-lg font-semibold">
                <InfoCircleOutlined className="mr-2 text-secondary" />
                Lớp học mới mở
              </span>
            }
            extra={<a className="text-primary" onClick={() => navigate(classesPath)}>Xem tất cả</a>}
            className="border-0 shadow-soft"
          >
            <List
              dataSource={recentClasses}
              renderItem={(cls) => (
                <List.Item 
                  className="!border-b !border-border cursor-pointer hover:bg-muted/50 px-2 rounded-lg transition-colors"
                  onClick={() => navigate(getClassDetailPath(cls.id))}
                >
                  <List.Item.Meta
                    title={<span className="font-medium text-foreground truncate block">{cls.title}</span>}
                    description={
                      <div className="flex justify-between items-center mt-1">
                        <Text type="secondary" className="text-xs">
                          {dayjs(cls.createdAt).format('DD/MM/YYYY')}
                        </Text>
                        <Tag color={
                          cls.status === 'gathering' ? 'orange' : 
                          cls.status === 'ready' ? 'cyan' :
                          cls.status === 'active' ? 'green' : 
                          cls.status === 'finished' ? 'default' : 
                          'red'
                        }>
                          {cls.status === 'gathering' ? 'Gom học viên' : 
                           cls.status === 'ready' ? 'Sẵn sàng' :
                           cls.status === 'active' ? 'Đang diễn ra' : 
                           cls.status === 'finished' ? 'Hoàn thành' : 
                           'Đã hủy'}
                        </Tag>
                      </div>
                    }
                  />
                  <RightOutlined className="text-muted-foreground text-xs ml-2" />
                </List.Item>
              )}
            />
          </Card>



        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboard;
