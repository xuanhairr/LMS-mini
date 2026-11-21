import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Input,
  Button,
  Select,
  Tag,
  Avatar,
  Modal,
  Dropdown,
  Form,
  Spin,
  Space,
  Drawer,
  DatePicker,
  App,
  Typography
} from 'antd';
import { ItemType } from 'antd/es/menu/interface';
import {
  SearchOutlined,
  PlusOutlined,
  LockOutlined,
  UnlockOutlined,
  DeleteOutlined,
  EditOutlined,
  UserOutlined,
  TeamOutlined,
  MailOutlined,
  PhoneOutlined,
  MoreOutlined,
  ReloadOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiFetch } from '@/lib/api';
import dayjs from 'dayjs';
import { useAuth } from '@/contexts/AuthContext';

const { RangePicker } = DatePicker;
const { Text } = Typography;

interface RoleConfig {
  label: string;
  value: string;
  color: string;
}

interface User {
  id: string;
  username: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  roles: string[];
  status?: 'active' | 'locked';
  creator?: { username: string; fullName?: string };
  updater?: { username: string; fullName?: string };
  createdAt: string;
  updatedAt: string;
}

const formatSchedule = (schedule?: any) => {
  if (!schedule) return 'Chưa có lịch';
  const daysMap: Record<number, string> = {
    2: 'T2', 3: 'T3', 4: 'T4', 5: 'T5', 6: 'T6', 7: 'T7', 8: 'CN'
  };
  const days = schedule.dayOfWeek?.map((d: number) => daysMap[d] || d).join(', ') || '';
  return `${days} (${schedule.shift || ''}${schedule.startTime ? `: ${schedule.startTime} - ${schedule.endTime}` : ''})`;
};

const AdminUsersPage: React.FC = () => {
  const { notification, modal } = App.useApp();
  const { user: currentUser } = useAuth();

  // State for data
  const [users, setUsers] = useState<User[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // State for pagination & filters
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeFilters, setActiveFilters] = useState<any>({});
  const [filterForm] = Form.useForm();

  // State for Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();

  // State for Detail Drawer
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<User | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [extraData, setExtraData] = useState<any>(null);
  const [classStatusConfig, setClassStatusConfig] = useState<Record<string, { color: string; label: string }>>({});

  // Quick Assign states
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedUserForAssign, setSelectedUserForAssign] = useState<User | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [classList, setClassList] = useState<any[]>([]);
  const [classSearchLoading, setClassSearchLoading] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const hasScheduleConflict = (classA: any, classB: any): boolean => {
    if (!classA.schedule || !classB.schedule) return false;
    if (!classA.startDate || !classB.startDate) return false;
    const daysA: number[] = classA.schedule.dayOfWeek;
    const daysB: number[] = classB.schedule.dayOfWeek;
    if (!daysA.some(d => daysB.includes(d))) return false;
    if (classA.schedule.shift !== classB.schedule.shift) return false;
    const startA = new Date(classA.startDate);
    const endA = new Date(classA.endDate || '9999-12-31');
    const startB = new Date(classB.startDate);
    const endB = new Date(classB.endDate || '9999-12-31');
    return startA <= endB && startB <= endA;
  };

  const detectConflicts = (selectedIds: string[]) => {
    const isStaff = selectedUserForAssign?.roles.includes('STAFF') || selectedUserForAssign?.roles.includes('HEAD_STAFF') || selectedUserForAssign?.roles.includes('ADMIN');
    if (isStaff || selectedIds.length < 2) { setConflicts([]); return; }
    const selected = selectedIds.map(id => classList.find((c: any) => c.id === id)).filter(Boolean);
    const warnings: string[] = [];
    for (let i = 0; i < selected.length; i++) {
      for (let j = i + 1; j < selected.length; j++) {
        if (hasScheduleConflict(selected[i], selected[j])) {
          warnings.push(`"${selected[i].title}" và "${selected[j].title}" trùng lịch (${selected[i].schedule.shift} - cùng thứ trong tuần)`);
        }
      }
    }
    setConflicts(warnings);
  };

  const fetchRoles = async () => {
    try {
      const res = await apiFetch<RoleConfig[]>('/users/roles');
      setAvailableRoles(res.data || []);
    } catch (error) {
      console.error('Không thể tải cấu hình vai trò');
    }
  };

  const fetchClasses = async (title?: string) => {
    setClassSearchLoading(true);
    try {
      const query = title
        ? `/classes?where[status][equals]=active&where[title][contains]=${title}&take=20`
        : `/classes?where[status][equals]=active&take=20`;
      const res = await apiFetch<any>(query);

      if (res.data && res.data.items) {
        setClassList(res.data.items);
      } else {
        setClassList(Array.isArray(res.data) ? res.data : []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setClassSearchLoading(false);
    }
  };

  const handleOpenAssign = (user: User) => {
    setSelectedUserForAssign(user);
    setIsAssignModalOpen(true);
    setSelectedClassIds([]);
    setConflicts([]);
    setClassList([]);
    fetchClasses("");
  };

  const closeAssignModal = () => {
    setIsAssignModalOpen(false);
    setSelectedClassIds([]);
    setConflicts([]);
    setClassList([]);
    setSelectedUserForAssign(null);
  };

  const handleQuickAssign = async () => {
    if (!selectedUserForAssign || selectedClassIds.length === 0) return;
    setAssignLoading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const isTeacher = selectedUserForAssign.roles.includes('TEACHER');

      await Promise.all(selectedClassIds.map(async (classId) => {
        const targetClass = classList.find(c => c.id === classId);
        if (!targetClass) return;

        try {
          const isStaff = selectedUserForAssign.roles.includes('STAFF') || selectedUserForAssign.roles.includes('HEAD_STAFF') || selectedUserForAssign.roles.includes('ADMIN');

          if (isTeacher) {
            await apiFetch<any>(`/classes/${classId}`, {
              method: 'PATCH',
              body: JSON.stringify({ teacherId: selectedUserForAssign.id }),
            });
          } else if (isStaff) {
            await apiFetch<any>(`/classes/${classId}`, {
              method: 'PATCH',
              body: JSON.stringify({ managerId: selectedUserForAssign.id }),
            });
          } else {
            await apiFetch<any>('/enrollments', {
              method: 'POST',
              body: JSON.stringify({
                student: { id: selectedUserForAssign.id },
                class: { id: classId },
                course: targetClass.courseId ? { id: targetClass.courseId } : undefined
              }),
            });
          }
          successCount++;
        } catch (e) {
          failCount++;
        }
      }));

      if (successCount > 0) {
        notification.success({
          message: 'Gán lớp hoàn tất',
          description: `Đã gán thành công vào ${successCount} lớp học.`,
          placement: 'topRight'
        });
      } else if (failCount > 0) {
        notification.error({
          message: 'Thất bại',
          description: 'Không thể gán vào các lớp đã chọn.',
          placement: 'topRight'
        });
      }

      closeAssignModal();
    } catch (error: any) {
      notification.error({
        message: 'Lỗi hệ thống',
        description: 'Đã xảy ra lỗi trong quá trình xử lý gán lớp.',
        placement: 'topRight'
      });
    } finally {
      setAssignLoading(false);
    }
  };

  const fetchUsers = useCallback(async (page = 1, limit = 10, filters = {}) => {
    setLoading(true);
    try {
      const skip = (page - 1) * limit;
      let query = `/users?skip=${skip}&take=${limit}&orderBy[createdAt]=desc`;

      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          if (key === 'roles' && value !== 'all') {
            query += `&where[roles][has]=${value}`;
          } else if (key === 'createdAt' && Array.isArray(value)) {
            const [start, end] = value;
            query += `&where[createdAt][gte]=${start.startOf('day').toISOString()}`;
            query += `&where[createdAt][lte]=${end.endOf('day').toISOString()}`;
          } else if (key === 'status' && value !== 'all') {
            query += `&where[status][equals]=${value}`;
          } else if (value !== 'all' && key !== 'roles') {
            query += `&where[${key}][contains]=${value}`;
          }
        }
      });

      if (currentUser?.role === 'STAFF' && (!filters.roles || filters.roles === 'all')) {
        query += `&where[roles][has]=STUDENT`;
      }

      const res = await apiFetch<any>(query);
      if (res.data && res.data.items) {
        setUsers(Array.isArray(res.data.items) ? res.data.items : []);
        setTotal(res.data.total || 0);
      } else {
        const dataArray = Array.isArray(res.data) ? res.data : [];
        setUsers(dataArray);
        setTotal(dataArray.length);
      }
    } catch (error) {
      notification.error({
        message: 'Lỗi tải dữ liệu',
        description: 'Không thể tải danh sách người dùng',
        placement: 'topRight'
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [notification]);

  useEffect(() => {
    fetchRoles();

    const fetchStatuses = async () => {
      try {
        const res = await apiFetch<any>('/classes/statuses');
        setClassStatusConfig(res.data || res);
      } catch (error) {
        console.error('Không thể tải trạng thái lớp học', error);
      }
    };
    fetchStatuses();
  }, []);

  useEffect(() => {
    fetchUsers(currentPage, pageSize, activeFilters);
  }, [currentPage, pageSize]);

  const roleHelper = useMemo(() => {
    const labels: Record<string, string> = {};
    const colors: Record<string, string> = {};
    if (Array.isArray(availableRoles)) {
      availableRoles.forEach(r => {
        labels[r.value] = r.label;
        colors[r.value] = r.color;
      });
    }
    return { labels, colors };
  }, [availableRoles]);

  const handleSearch = (values: any) => {
    setActiveFilters(values);
    setCurrentPage(1);
    fetchUsers(1, pageSize, values);
  };

  const handleReset = () => {
    filterForm.resetFields();
    setActiveFilters({});
    setCurrentPage(1);
    fetchUsers(1, pageSize);
  };

  const handleTableChange = (pagination: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  const openDrawer = (user: User | null = null) => {
    setEditingUser(user);
    if (user) {
      form.setFieldsValue({
        ...user,
        role: user.roles[0]
      });
    } else {
      form.resetFields();
    }
    setIsDrawerOpen(true);
  };

  const handleOpenDetail = async (user: User) => {
    setSelectedUserForDetail(user);
    setIsDetailDrawerOpen(true);
    setDetailLoading(true);
    setExtraData(null);
    try {
      if (user.roles.includes('STUDENT')) {
        const res = await apiFetch<any>(`/enrollments?where[studentId][equals]=${user.id}&include[course]=true&include[class][include][schedule]=true`);
        setExtraData(res.data && res.data.items ? res.data.items : (Array.isArray(res.data) ? res.data : []));
      } else if (user.roles.includes('TEACHER')) {
        const res = await apiFetch<any>(`/classes?where[teacherId][equals]=${user.id}`);
        setExtraData(res.data && res.data.items ? res.data.items : (Array.isArray(res.data) ? res.data : []));
      } else if (user.roles.includes('STAFF') || user.roles.includes('HEAD_STAFF')) {
        const res = await apiFetch<any>(`/classes?where[managerId][equals]=${user.id}`);
        setExtraData(res.data && res.data.items ? res.data.items : (Array.isArray(res.data) ? res.data : []));
      }
    } catch (error) {
      console.error('Không thể tải thông tin bổ sung', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveUser = async (values: any) => {
    try {
      setLoading(true);
      const { role, password, ...rest } = values;

      if (editingUser) {
        await apiFetch<any>(`/users/${editingUser.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            ...rest,
            roles: [role],
            ...(password ? { password } : {})
          }),
        });
        notification.success({
          message: 'Thành công',
          description: `Đã cập nhật thông tin cho ${values.fullName || values.email}`,
          placement: 'topRight'
        });
      } else {
        await apiFetch<any>('/users', {
          method: 'POST',
          body: JSON.stringify({
            ...rest,
            username: rest.email,
            password: password || rest.email,
            roles: [role],
            forcePasswordChange: true,
          }),
        });
        notification.success({
          message: 'Tạo tài khoản thành công',
          description: `Người dùng ${values.fullName || values.email} đã được thêm vào hệ thống`,
          placement: 'topRight'
        });
      }

      setIsDrawerOpen(false);
      fetchUsers(currentPage, pageSize, filterForm.getFieldsValue());
    } catch (error: any) {
      notification.error({
        message: 'Lỗi khi lưu',
        description: error.message || 'Không thể lưu thông tin người dùng',
        placement: 'topRight'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLock = (user: User) => {
    const isLocked = user.status === 'locked';
    modal.confirm({
      title: isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản',
      content: `Bạn có chắc chắn muốn ${isLocked ? 'mở khóa' : 'khóa'} tài khoản ${user.username}?`,
      okText: isLocked ? 'Mở khóa' : 'Khóa ngay',
      cancelText: 'Hủy',
      okType: isLocked ? 'primary' : 'danger',
      onOk: async () => {
        try {
          await apiFetch<any>(`/users/${user.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: isLocked ? 'active' : 'locked' }),
          });
          notification.success({
            message: 'Đã cập nhật',
            description: `Tài khoản ${user.username} đã được ${isLocked ? 'mở khóa' : 'khóa'}`,
            placement: 'topRight'
          });
          fetchUsers(currentPage, pageSize, filterForm.getFieldsValue());
        } catch (error) {
          notification.error({
            message: 'Thất bại',
            description: 'Lỗi khi cập nhật trạng thái tài khoản',
            placement: 'topRight'
          });
        }
      },
    });
  };

  const handleDelete = (user: User) => {
    modal.confirm({
      title: 'Xóa người dùng',
      content: `Bạn có chắc chắn muốn xóa tài khoản ${user.username}? Hành động này không thể hoàn tác.`,
      okText: 'Xóa vĩnh viễn',
      cancelText: 'Hủy',
      okType: 'danger',
      onOk: async () => {
        try {
          await apiFetch<any>(`/users/${user.id}`, { method: 'DELETE' });
          notification.success({
            message: 'Đã xóa',
            description: `Tài khoản ${user.username} đã bị xóa khỏi hệ thống`,
            placement: 'topRight'
          });
          fetchUsers(currentPage, pageSize, filterForm.getFieldsValue());
        } catch (error) {
          notification.error({
            message: 'Lỗi xóa',
            description: 'Không thể xóa người dùng này',
            placement: 'topRight'
          });
        }
      },
    });
  };

  const columns = [
    {
      title: 'Người dùng',
      dataIndex: 'fullName',
      key: 'fullName',
      width: 250,
      ellipsis: true,
      render: (text: string, record: User) => (
        <div className="flex items-center gap-3">
          <Avatar
            size={40}
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${record.username}`}
            className="border border-primary/10 flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground leading-tight truncate">{text || ''}</p>
            <p className="text-xs text-muted-foreground truncate">{record.username}</p>
          </div>
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <div className="text-muted-foreground flex items-center gap-2 text-sm min-w-0">
          <MailOutlined className="text-primary/50 flex-shrink-0" /> 
          <span className="truncate">{text || ''}</span>
        </div>
      ),
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      width: 150,
      ellipsis: true,
      render: (text: string) => (
        <div className="text-muted-foreground flex items-center gap-2 text-sm min-w-0">
          <PhoneOutlined className="text-primary/50 flex-shrink-0" hidden={!text} /> 
          <span className="truncate">{text || ''}</span>
        </div>
      ),
    },
    {
      title: 'Vai trò',
      dataIndex: 'roles',
      key: 'roles',
      width: 150,
      render: (roles: string[]) => (
        <Space size={4} wrap>
          {Array.isArray(roles) && roles.map(role => (
            <Tag color={roleHelper.colors[role] || 'blue'} key={role} className="rounded-full px-3 m-0 border-0 text-[11px] font-medium uppercase">
              {roleHelper.labels[role] || role}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => (
        <Tag color={status === 'locked' ? 'error' : 'success'} className="border-0 rounded-full px-3">
          {status === 'locked' ? 'Đã khóa' : 'Đang hoạt động'}
        </Tag>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => (
        <span className="text-muted-foreground">
          {dayjs(date).format('DD/MM/YYYY')}
        </span>
      ),
    },
    {
      title: 'Người tạo',
      key: 'creator',
      width: 150,
      render: (_: any, record: User) => record.creator ? (
        <Tag color="cyan">{record.creator.fullName || record.creator.username}</Tag>
      ) : ''
    },
    {
      title: 'Người cập nhật',
      key: 'updater',
      width: 150,
      render: (_: any, record: User) => record.updater ? (
        <Tag color="orange">{record.updater.fullName || record.updater.username}</Tag>
      ) : ''
    },
    {
      title: 'Ngày cập nhật',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 170,
      render: (val: string) => <span className="text-slate-600">{dayjs(val).format('DD/MM/YYYY HH:mm')}</span>
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (val: string) => <span className="text-slate-600">{dayjs(val).format('DD/MM/YYYY HH:mm')}</span>
    },
    {
      title: 'Hành động',
      key: 'action',
      fixed: 'right' as const,
      width: 120,
      align: 'center' as const,
      render: (_, record: User) => {
        const menuItems: ItemType[] = [
          {
            key: 'detail',
            icon: <EyeOutlined />,
            label: 'Xem chi tiết',
            onClick: () => handleOpenDetail(record),
          },
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Chỉnh sửa',
            onClick: () => openDrawer(record),
          },
          {
            key: 'assign',
            icon: <TeamOutlined />,
            label: 'Gán vào lớp',
            onClick: () => handleOpenAssign(record),
          },
          {
            key: 'lock',
            icon: record.status === 'locked' ? <UnlockOutlined /> : <LockOutlined />,
            label: record.status === 'locked' ? 'Mở khóa' : 'Khóa tài khoản',
            danger: record.status !== 'locked',
            onClick: () => handleToggleLock(record),
          },
          { type: 'divider' },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: 'Xóa người dùng',
            danger: true,
            onClick: () => handleDelete(record),
          },
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {currentUser?.role === 'STAFF' ? 'Học viên' : 'Người dùng'}
            </h1>
            <p className="text-muted-foreground">
              {currentUser?.role === 'STAFF' 
                ? 'Quản lý danh sách học viên trong hệ thống.' 
                : 'Quản lý danh sách, vai trò và trạng thái tài khoản hệ thống.'}
            </p>
          </div>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openDrawer()}
              className="rounded-lg shadow-md"
            >
              Thêm người dùng
            </Button>
          </Space>
        </div>

        <Card className="border-0 shadow-sm rounded-xl">
          <Form form={filterForm} layout="vertical" onFinish={handleSearch}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} lg={6}>
                <Form.Item name="fullName" label="Họ và tên" className="mb-0">
                  <Input placeholder="Nhập họ tên..." prefix={<UserOutlined className="text-muted-foreground" />} allowClear />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Form.Item name="phoneNumber" label="Số điện thoại" className="mb-0">
                  <Input placeholder="Nhập số điện thoại..." prefix={<PhoneOutlined className="text-muted-foreground" />} allowClear />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Form.Item name="createdAt" label="Ngày tạo" className="mb-0">
                  <RangePicker placeholder={['Từ ngày', 'Đến ngày']} className="w-full" />
                </Form.Item>
              </Col>
              {currentUser?.role !== 'STAFF' && (
                <Col xs={24} sm={12} lg={6}>
                  <Form.Item name="roles" label="Vai trò" className="mb-0" initialValue="all">
                    <Select options={[
                      { label: 'Tất cả', value: 'all' },
                      ...(Array.isArray(availableRoles) ? availableRoles.filter(r => r.value !== 'ADMIN').map(r => ({ label: r.label, value: r.value })) : [])
                    ]} />
                  </Form.Item>
                </Col>
              )}
              <Col xs={24} sm={12} lg={6}>
                <Form.Item name="status" label="Trạng thái" className="mb-0" initialValue="all">
                  <Select options={[
                    { label: 'Tất cả', value: 'all' },
                    { label: 'Hoạt động', value: 'active' },
                    { label: 'Bị khóa', value: 'locked' },
                  ]} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={currentUser?.role === 'STAFF' ? 24 : 18} className="flex items-end justify-end">
                <Space className="w-full justify-end">
                  <Button type="primary" htmlType="submit" icon={<SearchOutlined />} className="rounded-lg px-8" loading={loading}>
                    Tìm kiếm
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={handleReset} className="rounded-lg" disabled={loading}>
                    Đặt lại
                  </Button>
                </Space>
              </Col>
            </Row>
          </Form>
        </Card>

        <Card className="border-0 shadow-sm rounded-xl" styles={{ body: { padding: 0 } }}>
          <Table
            loading={loading}
            columns={columns}
            dataSource={Array.isArray(users) ? users.map(u => ({ ...u, key: u.id })) : []}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              showTotal: (total) => `Tổng cộng ${total} người dùng`,
              className: "p-4"
            }}
            onChange={handleTableChange}
            scroll={{ x: 1000, y: 'calc(100vh - 340px)' }}
          />
        </Card>
      </div>

      <Drawer
        title={editingUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
        width={480}
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        extra={
          <Space>
            <Button onClick={() => setIsDrawerOpen(false)}>Hủy</Button>
            <Button type="primary" onClick={() => form.submit()} loading={loading}>
              Xác nhận
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSaveUser}>
          <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
            <Input placeholder="Ví dụ: Nguyễn Văn A" />
          </Form.Item>
          <Form.Item 
            name="email" 
            label="Email" 
            rules={[
              { required: true, message: 'Vui lòng nhập Email' },
              { type: 'email', message: 'Email không hợp lệ' }
            ]}
          >
            <Input placeholder="Ví dụ: nva@gmail.com" />
          </Form.Item>
          <Form.Item 
            name="phoneNumber" 
            label="Số điện thoại"
            rules={[
              { pattern: /^[0-9+]+$/, message: 'Số điện thoại không hợp lệ' }
            ]}
          >
            <Input placeholder="Ví dụ: 0987654321" />
          </Form.Item>
          <div style={{ display: currentUser?.role === 'STAFF' ? 'none' : 'block' }}>
            <Form.Item name="role" label="Vai trò" rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]} initialValue="STUDENT">
              <Select>
                {Array.isArray(availableRoles) && availableRoles.filter(r => {
                  if (r.value === 'ADMIN') return false;
                  // Nếu là STAFF thì chỉ cho phép tạo STUDENT
                  if (currentUser?.role === 'STAFF' && r.value !== 'STUDENT') return false;
                  return true;
                }).map(r => (
                  <Select.Option key={r.value} value={r.value}>{r.label}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>
          <Form.Item name="password" label={editingUser ? "Mật khẩu mới (Bỏ trống nếu không đổi)" : "Mật khẩu (Mặc định: Trùng với Email)"}>
            <Input.Password placeholder="Nhập mật khẩu..." />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" initialValue="active">
            <Select options={[{ label: 'Hoạt động', value: 'active' }, { label: 'Bị khóa', value: 'locked' }]} />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title="Chi tiết người dùng"
        placement="right"
        width={600}
        onClose={() => setIsDetailDrawerOpen(false)}
        open={isDetailDrawerOpen}
        styles={{ body: { paddingBottom: 80 } }}
      >
        {selectedUserForDetail ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar size={64} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUserForDetail.username}`} />
              <div>
                <Typography.Title level={4} className="m-0">{selectedUserForDetail.fullName || selectedUserForDetail.username}</Typography.Title>
                <Text type="secondary">@{selectedUserForDetail.username}</Text>
                <div className="mt-1">
                  {selectedUserForDetail.roles.map(role => (
                    <Tag color="blue" key={role} className="rounded-full px-3 m-0 border-0 text-[11px] font-medium uppercase">
                      {role}
                    </Tag>
                  ))}
                  <Tag color={selectedUserForDetail.status === 'locked' ? 'error' : 'success'} className="border-0 rounded-full px-3">
                    {selectedUserForDetail.status === 'locked' ? 'Đã khóa' : 'Đang hoạt động'}
                  </Tag>
                </div>
              </div>
            </div>

            <Card className="border-0 bg-slate-50" styles={{ body: { padding: 16 } }}>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Text type="secondary">Email:</Text>
                  <Text>{selectedUserForDetail.email || ''}</Text>
                </div>
                <div className="flex justify-between">
                  <Text type="secondary">Số điện thoại:</Text>
                  <Text>{selectedUserForDetail.phoneNumber || ''}</Text>
                </div>
                <div className="flex justify-between">
                  <Text type="secondary">Ngày tạo:</Text>
                  <Text>{dayjs(selectedUserForDetail.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
                </div>
              </div>
            </Card>

            <div>
              <Typography.Title level={5} className="mb-4">Thông tin chuyên môn</Typography.Title>
              {detailLoading ? (
                <div className="text-center py-4"><Spin /></div>
              ) : (
                <div className="space-y-3">
                  {selectedUserForDetail.roles.includes('STUDENT') && (() => {
                    const classesLearning = extraData ? extraData.filter((item: any) => item.classId) : [];
                    return (
                      <div>
                        <Text strong>Lớp học đang học ({classesLearning.length}):</Text>
                        {classesLearning.length > 0 ? (
                          <div className="space-y-2 mt-2">
                            {classesLearning.map((item: any) => (
                              <div key={item.id} className="p-3 bg-white border border-slate-100 rounded-lg flex justify-between items-center">
                                <div>
                                  <Text strong>{item.class?.title || ''}</Text>
                                  <br />
                                  <Text type="secondary" className="text-xs">Khóa: {item.course?.title || item.courseId || ''}</Text>
                                  <br />
                                  <Text type="secondary" className="text-xs">Thời gian: {item.class?.startDate ? dayjs(item.class.startDate).format('DD/MM/YYYY') : ''} - {item.class?.endDate ? dayjs(item.class.endDate).format('DD/MM/YYYY') : ''}</Text>
                                  <br />
                                  <Text type="secondary" className="text-xs">Lịch: {formatSchedule(item.class?.schedule)}</Text>
                                </div>
                                <Tag color={item.completed ? 'success' : 'processing'}>{item.completed ? 'Hoàn thành' : 'Đang học'}</Tag>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-slate-400 text-sm mt-2">Chưa tham gia lớp học nào.</div>
                        )}
                      </div>
                    );
                  })()}

                  {selectedUserForDetail.roles.includes('TEACHER') && (
                    <div>
                      <Text strong>Lớp học đang phụ trách ({extraData?.length || 0}):</Text>
                      {extraData && extraData.length > 0 ? (
                        <div className="space-y-2 mt-2">
                          {extraData.map((item: any) => (
                            <div key={item.id} className="p-3 bg-white border border-slate-100 rounded-lg flex justify-between items-center">
                              <div>
                                <Text strong>{item.title}</Text>
                                <br />
                                <Text type="secondary" className="text-xs">Khóa: {item.course?.title || item.courseId || ''}</Text>
                                <br />
                                <Text type="secondary" className="text-xs">Thời gian: {item.startDate ? dayjs(item.startDate).format('DD/MM/YYYY') : ''} - {item.endDate ? dayjs(item.endDate).format('DD/MM/YYYY') : ''}</Text>
                                <br />
                                <Text type="secondary" className="text-xs">Lịch: {formatSchedule(item.schedule)}</Text>
                              </div>
                              <Tag color={classStatusConfig[item.status]?.color || 'default'} className="border-0 rounded-full px-3 m-0">
                                {classStatusConfig[item.status]?.label || item.status}
                              </Tag>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-400 text-sm mt-2">Chưa phân công lớp học nào.</div>
                      )}
                    </div>
                  )}

                  {(selectedUserForDetail.roles.includes('STAFF') || selectedUserForDetail.roles.includes('HEAD_STAFF')) && (
                    <div>
                      <Text strong>Lớp học đang quản lý ({extraData?.length || 0}):</Text>
                      {extraData && extraData.length > 0 ? (
                        <div className="space-y-2 mt-2">
                          {extraData.map((item: any) => (
                            <div key={item.id} className="p-3 bg-white border border-slate-100 rounded-lg flex justify-between items-center">
                              <div>
                                <Text strong>{item.title}</Text>
                                <br />
                                <Text type="secondary" className="text-xs">Khóa: {item.course?.title || item.courseId || ''}</Text>
                                <br />
                                <Text type="secondary" className="text-xs">Thời gian: {item.startDate ? dayjs(item.startDate).format('DD/MM/YYYY') : ''} - {item.endDate ? dayjs(item.endDate).format('DD/MM/YYYY') : ''}</Text>
                                <br />
                                <Text type="secondary" className="text-xs">Lịch: {formatSchedule(item.schedule)}</Text>
                              </div>
                              <Tag color={classStatusConfig[item.status]?.color || 'default'} className="border-0 rounded-full px-3 m-0">
                                {classStatusConfig[item.status]?.label || item.status}
                              </Tag>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-400 text-sm mt-2">Chưa quản lý lớp học nào.</div>
                      )}
                    </div>
                  )}

                  {!selectedUserForDetail.roles.includes('STUDENT') && !selectedUserForDetail.roles.includes('TEACHER') && !selectedUserForDetail.roles.includes('STAFF') && !selectedUserForDetail.roles.includes('HEAD_STAFF') && (
                    <div className="text-slate-400 text-sm">Không có thông tin bổ sung.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8"><Spin /></div>
        )}
      </Drawer>

      <Modal
        title={`Gán vào lớp - ${selectedUserForAssign?.username}`}
        open={isAssignModalOpen}
        onCancel={closeAssignModal}
        onOk={handleQuickAssign}
        confirmLoading={assignLoading}
        okText="Xác nhận"
        cancelText="Hủy"
        okButtonProps={{ disabled: conflicts.length > 0 }}
        className="rounded-xl"
      >
        <div className="py-2 space-y-3">
          <div className="bg-primary/5 p-4 rounded-lg">
            <p className="text-sm text-primary font-medium m-0">
              {(selectedUserForAssign?.roles.includes('STAFF') || selectedUserForAssign?.roles.includes('HEAD_STAFF') || selectedUserForAssign?.roles.includes('ADMIN'))
                ? 'Chọn các lớp học để phân công giáo vụ này quản lý.'
                : selectedUserForAssign?.roles.includes('TEACHER')
                  ? 'Chọn các lớp học giảng viên này sẽ đảm nhận. Hệ thống sẽ tự kiểm tra xung đột lịch.'
                  : 'Chọn các lớp học để ghi danh học viên này. Hệ thống sẽ tự kiểm tra xung đột lịch.'}
            </p>
          </div>

          {conflicts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 font-semibold text-sm mb-2">⚠️ Phát hiện {conflicts.length} xung đột lịch học!</p>
              <ul className="space-y-1 m-0 pl-4">
                {conflicts.map((c, i) => (
                  <li key={i} className="text-red-500 text-xs">{c}</li>
                ))}
              </ul>
              <p className="text-red-400 text-xs mt-2 mb-0">Vui lòng bỏ chọn các lớp trùng lịch trước khi xác nhận.</p>
            </div>
          )}
          <Select
            mode="multiple"
            value={selectedClassIds}
            placeholder="Tìm kiếm và xem lịch học chi tiết..."
            style={{ width: '100%' }}
            onSearch={(val) => {
              if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
              searchTimeoutRef.current = setTimeout(() => fetchClasses(val), 500);
            }}
            onChange={(ids: string[]) => {
              setSelectedClassIds(ids);
              detectConflicts(ids);
            }}
            loading={classSearchLoading}
            filterOption={false}
            notFoundContent={classSearchLoading ? <Spin size="small" /> : 'Không tìm thấy lớp học'}
            size="large"
            maxTagCount="responsive"
            listHeight={400}
          >
            {Array.isArray(classList) && classList.map(c => {
              const dateRange = c.startDate && c.endDate
                ? `${dayjs(c.startDate).format('DD/MM/YYYY')} - ${dayjs(c.endDate).format('DD/MM/YYYY')}`
                : 'Chưa xác định thời gian';

              // Format schedule object thành string hiển thị
              const scheduleText = c.schedule
                ? `${c.schedule.dayOfWeek.map((d: number) => d === 8 ? 'CN' : `T${d}`).join(', ')} · ${c.schedule.shift} (${c.schedule.startTime}-${c.schedule.endTime})`
                : 'Chưa cài đặt lịch học';

              return (
                <Select.Option key={c.id} value={c.id}>
                  <div className="py-2 border-b border-gray-50 last:border-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-base text-primary">{c.title}</span>
                      <Tag className="rounded-full text-[10px] m-0 bg-blue-50 border-0 text-blue-600">
                        {c.course?.title || 'Khóa học'}
                      </Tag>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <ClockCircleOutlined className="text-purple-500" />
                        <span className={`font-medium px-2 py-0.5 rounded ${c.schedule ? 'text-purple-700 bg-purple-50' : 'text-gray-400 italic'}`}>
                          {scheduleText}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <CalendarOutlined />
                        <span>{dateRange}</span>
                      </div>
                    </div>
                  </div>
                </Select.Option>
              );
            })}
          </Select>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

const AdminUsersPageWithApp: React.FC = () => (
  <App>
    <AdminUsersPage />
  </App>
);

export default AdminUsersPageWithApp;
