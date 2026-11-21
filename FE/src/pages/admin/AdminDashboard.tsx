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
  InfoCircleOutlined
} from '@ant-design/icons';
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

  const [gatheringClasses, setGatheringClasses] = useState<any[]>([]);
  const [readyClassesWithoutTeacher, setReadyClassesWithoutTeacher] = useState<any[]>([]);

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
        activeClassesRes
      ] = await Promise.all([
        apiFetch<any>('/users?where[roles][has]=STUDENT&take=1'),
        apiFetch<any>('/users?where[roles][has]=TEACHER&take=1'),
        apiFetch<any>('/courses?take=1'),
        apiFetch<any>(`/classes?${classQueryPrefix}take=1`),
        apiFetch<any>(`/classes?${classQueryPrefix}where[status]=active&take=1`),
      ]);

      setStats({
        totalStudents: studentsRes.data?.total || 0,
        totalTeachers: teachersRes.data?.total || 0,
        totalCourses: coursesRes.data?.total || 0,
        totalClasses: totalClassesRes.data?.total || 0,
        activeClasses: activeClassesRes.data?.total || 0,
      });

      // 2. Fetch classes for Smart Alerts
      // Lớp gathering sắp khai giảng (<= 3 ngày)
      const gatheringRes = await apiFetch<any>(`/classes?${classQueryPrefix}where[status]=gathering&orderBy[startDate]=asc`);
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
      const readyRes = await apiFetch<any>(`/classes?${classQueryPrefix}where[status]=ready`);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  const roleName = user?.role === 'ADMIN' ? 'Quản trị viên' : user?.role === 'HEAD_STAFF' ? 'Trưởng giáo vụ' : 'Giáo vụ';

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
                        onClick={() => navigate(classesPath, { state: { searchTitle: item.title.split(' ')[0] } })}
                      >
                        <div className="flex justify-between w-full items-center">
                          <div className="flex flex-col">
                            <Text strong>{item.title}</Text>
                            <Text type="secondary" className="text-xs">Ngày khai giảng: {dayjs(item.startDate).format('DD/MM/YYYY')}</Text>
                          </div>
                          <Tag color={item.alertType === 'gathering_to_ready' ? 'orange' : 'green'}>
                            {item.alertType === 'gathering_to_ready' ? 'Gom học viên ➡️ Sẵn sàng' : 'Sẵn sàng ➡️ Đang diễn ra'}
                          </Tag>
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
