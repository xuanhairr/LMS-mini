import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, Badge } from 'antd';
import {
  DashboardOutlined,
  BookOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  TeamOutlined,
  BarChartOutlined,
  ReadOutlined,
  TagsOutlined,
  CalendarOutlined,
  TrophyOutlined,
  CodeOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { CheckOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Header, Sider, Content } = Layout;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const getMenuItems = () => {
    const baseItems = [
      {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: 'Dashboard',
      },
    ];

    if (user?.role === 'STUDENT') {
      return [
        ...baseItems,
        { key: '/student/my-courses', icon: <ReadOutlined />, label: 'Khóa học của tôi' },
        { key: '/student/attendance', icon: <CalendarOutlined />, label: 'Điểm danh' },
        { key: '/student/assignments', icon: <BookOutlined />, label: 'Bài tập' },
        { key: '/student/grades', icon: <TrophyOutlined />, label: 'Bảng điểm' },
        { key: '/code-playground', icon: <CodeOutlined />, label: 'Thực hành Code' },
        { key: '/profile', icon: <UserOutlined />, label: 'Hồ sơ cá nhân' },
      ];
    }

    if (user?.role === 'TEACHER') {
      return [
        ...baseItems,
        { key: '/manage-courses', icon: <BookOutlined />, label: 'Quản lý khóa học' },
        { key: '/teacher/classes', icon: <ReadOutlined />, label: 'Quản lý Lớp học' },
        { key: '/teacher/schedule', icon: <CalendarOutlined />, label: 'Lịch giảng dạy' },
        { key: '/code-playground', icon: <CodeOutlined />, label: 'Thực hành Code' },
        { key: '/profile', icon: <UserOutlined />, label: 'Hồ sơ cá nhân' },
      ];
    }

    if (user?.role === 'ADMIN' || user?.role === 'STAFF' || user?.role === 'HEAD_STAFF') {
      const items = [
        ...baseItems,
      ];

      if (user?.role === 'STAFF') {
        items.push(
          { key: '/staff/users', icon: <TeamOutlined />, label: 'Quản lý học viên' }
        );
      } else if (user?.role === 'ADMIN' || user?.role === 'HEAD_STAFF') {
        items.push(
          { key: '/admin/users', icon: <TeamOutlined />, label: 'Quản lý người dùng' }
        );
      }

      if (user?.role === 'ADMIN' || user?.role === 'HEAD_STAFF') {
        items.push(
          { key: '/all-courses', icon: <BookOutlined />, label: 'Quản lý khóa học' }
        );
      }

      items.push(
        { key: user?.role === 'STAFF' ? '/staff/classes' : '/admin/classes', icon: <ReadOutlined />, label: 'Quản lý Lớp học' }
      );

      if (user?.role === 'ADMIN' || user?.role === 'HEAD_STAFF') {
        items.push(...(user?.role === 'ADMIN' ? [
          { key: '/admin/departments', icon: <ApartmentOutlined />, label: 'Quản lý Bộ môn' },
          { key: '/admin/shifts', icon: <ReadOutlined />, label: 'Quản lý Ca học' },
          { key: '/admin/categories', icon: <TagsOutlined />, label: 'Quản lý Danh mục' }
        ] : [
          { key: '/admin/departments', icon: <ApartmentOutlined />, label: 'Quản lý Bộ môn' }
        ]));
      }

      return items;
    }

    return baseItems;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Hồ sơ cá nhân',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Cài đặt',
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      onClick: handleLogout,
    },
  ];

  const getRoleBadge = () => {
    switch (user?.role) {
      case "STUDENT":
        return "Sinh viên";
      case "TEACHER":
        return "Giảng viên";
      case "ADMIN":
        return "Quản trị viên";
      case "STAFF":
        return "Giáo vụ";
      case "HEAD_STAFF":
        return "Giáo vụ trưởng";
      default:
        return "Người dùng";
    }
  };

  // Menu items cho thông báo
  const notificationMenuItems = notifications.length === 0
    ? [{ key: 'empty', label: <div className="py-8 text-center text-slate-400 text-sm">Không có thông báo nào</div>, disabled: true }]
    : notifications.slice(0, 10).map(n => ({
        key: n.id,
        label: (
          <div
            className={`py-2 max-w-xs flex items-start gap-2 ${!n.isRead ? 'bg-blue-50/50' : ''}`}
            onClick={() => {
              markAsRead(n.id);
              if (n.link) navigate(n.link);
            }}
          >
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.isRead ? 'bg-primary' : 'bg-transparent'}`} />
            <div>
              <p className={`text-sm mb-0.5 ${!n.isRead ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                {n.title}
              </p>
              <p className="text-xs text-slate-500 mb-1 leading-snug">{n.message}</p>
              <span className="text-[10px] text-muted-foreground">{dayjs(n.createdAt).fromNow()}</span>
            </div>
          </div>
        ),
      }));

  const handleMarkAllAsRead = () => markAsRead();

  return (
    <Layout className="min-h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="!bg-sidebar"
        width={260}
      >
        <div className="flex items-center justify-center h-16 border-b border-sidebar-border">
          {!collapsed ? (
            <span className="text-xl font-bold text-sidebar-primary">
              📚 LMS Portal
            </span>
          ) : (
            <span className="text-2xl">📚</span>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          onClick={({ key }) => navigate(key)}
          className="!bg-transparent !border-none mt-4"
          style={{
            background: "transparent",
          }}
          theme="dark"
        />
      </Sider>

      <Layout>
        <Header className="!bg-card !px-6 flex items-center justify-between shadow-soft border-b border-border">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="text-lg"
          />

          <div className="flex items-center gap-4">
            {/* Dropdown Thông báo */}
            <Dropdown
              menu={{ items: notificationMenuItems }}
              placement="bottomRight"
              trigger={['click']}
              dropdownRender={(menu) => (
                <div className="bg-card shadow-lg rounded-lg border border-border">
                  <div className="px-4 py-3 border-b border-border flex justify-between items-center min-w-[300px]">
                    <span className="font-semibold text-foreground">Thông báo</span>
                    <Button
                      type="link"
                      size="small"
                      className="!p-0 text-xs text-primary hover:text-primary-hover"
                      onClick={handleMarkAllAsRead}
                    >
                      Đánh dấu tất cả đã đọc
                    </Button>
                  </div>
                  {menu}
                </div>
              )}
            >
              <Badge count={unreadCount} size="small" className="cursor-pointer">
                <Button
                  type="text"
                  icon={<BellOutlined className="text-lg" />}
                  className="flex items-center justify-center"
                />
              </Badge>
            </Dropdown>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="flex items-center gap-3 cursor-pointer hover:bg-muted rounded-lg px-3 py-2 transition-colors">
                <Avatar src={user?.avatar} icon={<UserOutlined />} />
                <div className="hidden md:flex md:flex-col">
                  <div className="font-medium text-foreground leading-tight">
                    {user?.fullName || user?.name || user?.username}
                  </div>
                  <div className="text-xs text-muted-foreground leading-tight">
                    {getRoleBadge()}
                  </div>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content className="m-6 p-6 bg-card rounded-lg shadow-soft min-h-[calc(100vh-120px)]">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;
