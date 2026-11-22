import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
  message,
  Row,
  Col,
  Statistic,
  Drawer,
  Avatar,
  Empty,
  Tooltip,
  Divider,
  Spin
} from 'antd';
import {
  ApartmentOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  BookOutlined,
  UserOutlined,
  SearchOutlined,
  CrownOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiFetch } from '@/lib/api';

const { Title, Text, Paragraph } = Typography;

interface DepartmentItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  headId?: string;
  head?: {
    id: string;
    username: string;
    fullName?: string;
    avatar?: string;
    email?: string;
  };
  teachersCount: number;
  coursesCount: number;
  createdAt: string;
}

const AdminDepartments: React.FC = () => {
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Modal Tạo / Sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [form] = Form.useForm();
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Danh sách giảng viên để chọn Trưởng bộ môn hoặc thêm vào bộ môn
  const [teachersList, setTeachersList] = useState<any[]>([]);

  // Drawer quản lý nhân sự
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDeptDetail, setSelectedDeptDetail] = useState<any>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Modal thêm GV vào bộ môn
  const [addTeacherModalOpen, setAddTeacherModalOpen] = useState(false);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [addingTeachers, setAddingTeachers] = useState(false);

  // Load danh sách Bộ môn
  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<DepartmentItem[]>('/departments');
      setDepartments(res.data || []);
    } catch (err: any) {
      message.error('Lỗi khi tải danh sách Bộ môn: ' + (err?.message || 'Lỗi hệ thống'));
    } finally {
      setLoading(false);
    }
  };

  // Load danh sách Giảng viên để chọn
  const fetchAllTeachers = async () => {
    try {
      const res = await apiFetch<any>('/users?where[roles][has]=TEACHER&take=200');
      const list = res.data?.items || (Array.isArray(res.data) ? res.data : []);
      setTeachersList(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchAllTeachers();
  }, []);

  // Mở modal tạo mới
  const handleOpenCreate = () => {
    setEditingDept(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  // Mở modal sửa
  const handleOpenEdit = (dept: DepartmentItem) => {
    setEditingDept(dept);
    form.setFieldsValue({
      code: dept.code,
      name: dept.name,
      description: dept.description,
      headId: dept.headId || undefined,
    });
    setIsModalOpen(true);
  };

  // Lưu tạo / sửa
  const handleSaveDepartment = async () => {
    try {
      const values = await form.validateFields();
      setModalSubmitting(true);

      if (editingDept) {
        await apiFetch(`/departments/${editingDept.id}`, {
          method: 'PATCH',
          body: JSON.stringify(values),
        });
        message.success('Cập nhật Bộ môn thành công!');
      } else {
        await apiFetch('/departments', {
          method: 'POST',
          body: JSON.stringify(values),
        });
        message.success('Tạo Bộ môn mới thành công!');
      }

      setIsModalOpen(false);
      form.resetFields();
      fetchDepartments();
      fetchAllTeachers();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'Có lỗi xảy ra khi lưu thông tin');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Xóa Bộ môn
  const handleDeleteDepartment = async (id: string) => {
    try {
      await apiFetch(`/departments/${id}`, { method: 'DELETE' });
      message.success('Đã xóa Bộ môn');
      fetchDepartments();
      fetchAllTeachers();
    } catch (err: any) {
      message.error(err?.message || 'Không thể xóa Bộ môn');
    }
  };

  // Mở Drawer nhân sự bộ môn
  const handleOpenPersonnel = async (dept: DepartmentItem) => {
    setDrawerOpen(true);
    setDrawerLoading(true);
    try {
      const res = await apiFetch<any>(`/departments/${dept.id}`);
      setSelectedDeptDetail(res.data);
    } catch (err: any) {
      message.error('Lỗi khi tải chi tiết nhân sự bộ môn');
    } finally {
      setDrawerLoading(false);
    }
  };

  // Refresh Drawer sau khi thêm/gỡ
  const refreshPersonnelDetail = async (deptId: string) => {
    setDrawerLoading(true);
    try {
      const res = await apiFetch<any>(`/departments/${deptId}`);
      setSelectedDeptDetail(res.data);
      fetchDepartments(); // update counts
      fetchAllTeachers();
    } catch (err) {
      console.error(err);
    } finally {
      setDrawerLoading(false);
    }
  };

  // Thêm GV vào bộ môn
  const handleAddTeachersToDept = async () => {
    if (!selectedDeptDetail || selectedTeacherIds.length === 0) return;
    setAddingTeachers(true);
    try {
      await apiFetch(`/departments/${selectedDeptDetail.id}/teachers`, {
        method: 'POST',
        body: JSON.stringify({ userIds: selectedTeacherIds }),
      });
      message.success(`Đã thêm ${selectedTeacherIds.length} giảng viên vào bộ môn!`);
      setAddTeacherModalOpen(false);
      setSelectedTeacherIds([]);
      refreshPersonnelDetail(selectedDeptDetail.id);
    } catch (err: any) {
      message.error(err?.message || 'Lỗi khi thêm giảng viên');
    } finally {
      setAddingTeachers(false);
    }
  };

  // Gỡ GV khỏi bộ môn
  const handleRemoveTeacher = async (teacherId: string) => {
    if (!selectedDeptDetail) return;
    try {
      await apiFetch(`/departments/${selectedDeptDetail.id}/teachers/${teacherId}`, {
        method: 'DELETE',
      });
      message.success('Đã gỡ giảng viên khỏi bộ môn');
      refreshPersonnelDetail(selectedDeptDetail.id);
    } catch (err: any) {
      message.error(err?.message || 'Lỗi khi gỡ giảng viên');
    }
  };

  // Lọc dữ liệu theo search
  const filteredDepartments = departments.filter((d) => {
    const q = searchText.toLowerCase().trim();
    if (!q) return true;
    return (
      d.name.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      (d.description && d.description.toLowerCase().includes(q)) ||
      (d.head && (d.head.fullName || d.head.username).toLowerCase().includes(q))
    );
  });

  // Tổng số giảng viên trực thuộc tất cả bộ môn
  const totalTeachersInDepts = departments.reduce((acc, curr) => acc + (curr.teachersCount || 0), 0);
  const totalCoursesInDepts = departments.reduce((acc, curr) => acc + (curr.coursesCount || 0), 0);

  const columns = [
    {
      title: 'Mã & Tên Bộ môn',
      key: 'name',
      render: (_: any, record: DepartmentItem) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Tag color="geekblue" className="font-semibold px-2 py-0.5 rounded text-xs">
              {record.code}
            </Tag>
            <span className="font-bold text-slate-800 text-sm hover:text-blue-600 transition-colors">
              {record.name}
            </span>
          </div>
          {record.description && (
            <Text type="secondary" className="text-xs mt-1 line-clamp-1 max-w-md">
              {record.description}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Trưởng bộ môn',
      key: 'head',
      render: (_: any, record: DepartmentItem) => {
        if (!record.head) {
          return <Tag color="warning">Chưa bổ nhiệm</Tag>;
        }
        return (
          <div className="flex items-center gap-2">
            <Avatar
              icon={<UserOutlined />}
              src={record.head.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${record.head.username}`}
              size="small"
              className="border border-amber-400"
            />
            <div>
              <div className="font-semibold text-slate-800 text-xs flex items-center gap-1">
                {record.head.fullName || record.head.username}
                <CrownOutlined className="text-amber-500 text-[10px]" title="Trưởng bộ môn" />
              </div>
              <div className="text-[11px] text-muted-foreground">{record.head.email || record.head.username}</div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Giảng viên',
      key: 'teachersCount',
      width: 130,
      render: (_: any, record: DepartmentItem) => (
        <Button
          type="dashed"
          size="small"
          icon={<TeamOutlined />}
          onClick={() => handleOpenPersonnel(record)}
          className="rounded-full text-xs hover:border-blue-500 hover:text-blue-600"
        >
          {record.teachersCount} giảng viên
        </Button>
      ),
    },
    {
      title: 'Khóa học',
      key: 'coursesCount',
      width: 120,
      render: (_: any, record: DepartmentItem) => (
        <Tag color="cyan" className="rounded-full px-2.5 py-0.5">
          <BookOutlined className="mr-1" />
          {record.coursesCount} môn học
        </Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 190,
      render: (_: any, record: DepartmentItem) => (
        <Space size="small">
          <Button
            type="primary"
            ghost
            size="small"
            icon={<UserAddOutlined />}
            onClick={() => handleOpenPersonnel(record)}
            className="rounded-md text-xs"
          >
            Nhân sự
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
            className="rounded-md text-xs"
          >
            Sửa
          </Button>
          <Popconfirm
            title={`Xóa bộ môn "${record.name}"?`}
            description="Các giảng viên và môn học sẽ được hủy liên kết tự động (không bị xóa tài khoản)."
            onConfirm={() => handleDeleteDepartment(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <ApartmentOutlined className="text-2xl text-blue-600" />
              <Title level={3} className="m-0 text-slate-800">
                Quản lý Khoa & Bộ môn
              </Title>
            </div>
            <Paragraph type="secondary" className="m-0 mt-1 text-sm">
              Tổ chức cơ cấu đơn vị đào tạo, bổ nhiệm Trưởng bộ môn và phân công nhân sự giảng dạy.
            </Paragraph>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={handleOpenCreate}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm font-medium"
          >
            Thêm Bộ môn mới
          </Button>
        </div>

        {/* Thống kê nhanh */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card className="border-0 shadow-soft rounded-xl hover:shadow-md transition-shadow">
              <Statistic
                title={<span className="text-muted-foreground font-medium">Tổng số Bộ môn</span>}
                value={departments.length}
                prefix={<ApartmentOutlined className="text-blue-500 mr-2" />}
                valueStyle={{ color: '#1e293b', fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="border-0 shadow-soft rounded-xl hover:shadow-md transition-shadow">
              <Statistic
                title={<span className="text-muted-foreground font-medium">Giảng viên thuộc Bộ môn</span>}
                value={totalTeachersInDepts}
                prefix={<TeamOutlined className="text-emerald-500 mr-2" />}
                valueStyle={{ color: '#1e293b', fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="border-0 shadow-soft rounded-xl hover:shadow-md transition-shadow">
              <Statistic
                title={<span className="text-muted-foreground font-medium">Môn học đã phân bổ</span>}
                value={totalCoursesInDepts}
                prefix={<BookOutlined className="text-indigo-500 mr-2" />}
                valueStyle={{ color: '#1e293b', fontWeight: 700 }}
              />
            </Card>
          </Col>
        </Row>

        {/* Bảng danh sách */}
        <Card className="border-0 shadow-soft rounded-2xl overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-5">
            <Input
              placeholder="Tìm kiếm theo mã, tên bộ môn hoặc trưởng bộ môn..."
              prefix={<SearchOutlined className="text-muted-foreground" />}
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="max-w-md rounded-lg"
            />
            <Text type="secondary" className="text-xs">
              Tìm thấy <strong className="text-slate-800">{filteredDepartments.length}</strong> bộ môn
            </Text>
          </div>

          <Table
            dataSource={filteredDepartments}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            className="border-t border-slate-100"
          />
        </Card>

        {/* Modal Thêm / Sửa Bộ môn */}
        <Modal
          title={editingDept ? 'Chỉnh sửa thông tin Bộ môn' : 'Thêm mới Khoa / Bộ môn'}
          open={isModalOpen}
          onOk={handleSaveDepartment}
          onCancel={() => setIsModalOpen(false)}
          confirmLoading={modalSubmitting}
          okText={editingDept ? 'Lưu thay đổi' : 'Tạo mới'}
          cancelText="Hủy"
          width={560}
          destroyOnClose
        >
          <Form form={form} layout="vertical" className="mt-4">
            <Form.Item
              name="code"
              label="Mã Bộ môn"
              rules={[
                { required: true, message: 'Vui lòng nhập mã bộ môn (VD: CNPM, HTTT)' },
                { pattern: /^[a-zA-Z0-9_-]+$/, message: 'Mã bộ môn chỉ gồm chữ cái, số, gạch nối' }
              ]}
              extra="Mã định danh viết hoa không dấu, ví dụ: CNPM, KTPM, AI, MKT"
            >
              <Input placeholder="VD: CNPM" style={{ textTransform: 'uppercase' }} />
            </Form.Item>

            <Form.Item
              name="name"
              label="Tên Bộ môn / Khoa"
              rules={[{ required: true, message: 'Vui lòng nhập tên đầy đủ của bộ môn' }]}
            >
              <Input placeholder="VD: Bộ môn Công nghệ phần mềm" />
            </Form.Item>

            <Form.Item name="description" label="Mô tả chuyên môn">
              <Input.TextArea rows={3} placeholder="Mô tả phạm vi chuyên môn hoặc định hướng đào tạo của bộ môn..." />
            </Form.Item>

            <Form.Item name="headId" label="Trưởng bộ môn (Head of Department)">
              <Select
                showSearch
                placeholder="Chọn giảng viên đảm nhiệm Trưởng bộ môn..."
                allowClear
                filterOption={(input, option) =>
                  ((option?.label ?? '') as string).toLowerCase().includes(input.toLowerCase())
                }
                options={teachersList.map((t) => ({
                  value: t.id,
                  label: `${t.fullName ? `${t.fullName} (@${t.username})` : t.username} - ${t.email || ''}`,
                }))}
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* Drawer Quản lý Nhân sự Giảng viên của Bộ môn */}
        <Drawer
          title={
            <div className="flex items-center gap-2">
              <ApartmentOutlined className="text-blue-600 text-lg" />
              <div>
                <span className="font-bold text-slate-800">
                  Nhân sự: {selectedDeptDetail?.name} ({selectedDeptDetail?.code})
                </span>
              </div>
            </div>
          }
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={720}
          extra={
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => {
                setSelectedTeacherIds([]);
                setAddTeacherModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Thêm Giảng viên
            </Button>
          }
        >
          {drawerLoading ? (
            <div className="flex justify-center items-center h-48">
              <Spin tip="Đang tải dữ liệu nhân sự..." />
            </div>
          ) : selectedDeptDetail ? (
            <div className="space-y-6">
              {/* Thẻ Trưởng bộ môn */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar
                    size={48}
                    src={selectedDeptDetail.head?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedDeptDetail.head?.username}`}
                    icon={<UserOutlined />}
                    className="border-2 border-amber-400 bg-white"
                  />
                  <div>
                    <div className="text-xs text-amber-700 font-semibold uppercase tracking-wide flex items-center gap-1">
                      <CrownOutlined /> Trưởng bộ môn đương nhiệm
                    </div>
                    <div className="text-base font-bold text-slate-800">
                      {selectedDeptDetail.head?.fullName || selectedDeptDetail.head?.username || 'Chưa bổ nhiệm'}
                    </div>
                    {selectedDeptDetail.head?.email && (
                      <div className="text-xs text-muted-foreground">{selectedDeptDetail.head.email}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bảng danh sách Giảng viên */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-slate-800 m-0 text-sm">
                    Danh sách Giảng viên trực thuộc ({selectedDeptDetail.teachers?.length || 0})
                  </h4>
                </div>

                <Table
                  dataSource={selectedDeptDetail.teachers || []}
                  rowKey="id"
                  pagination={{ pageSize: 8 }}
                  size="small"
                  columns={[
                    {
                      title: 'Giảng viên',
                      key: 'name',
                      render: (_: any, record: any) => (
                        <div className="flex items-center gap-2.5 py-1">
                          <Avatar
                            src={record.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${record.username}`}
                            icon={<UserOutlined />}
                          />
                          <div>
                            <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                              {record.fullName || record.username}
                              {record.id === selectedDeptDetail.headId && (
                                <Tag color="gold" className="text-[10px] px-1 py-0 m-0">Trưởng BM</Tag>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">@{record.username}</div>
                          </div>
                        </div>
                      ),
                    },
                    {
                      title: 'Liên hệ',
                      key: 'contact',
                      render: (_: any, record: any) => (
                        <div className="text-xs">
                          <div>{record.email || 'N/A'}</div>
                          <div className="text-muted-foreground text-[11px]">{record.phoneNumber || ''}</div>
                        </div>
                      ),
                    },
                    {
                      title: 'Hành động',
                      key: 'action',
                      width: 100,
                      render: (_: any, record: any) => (
                        <Popconfirm
                          title={`Gỡ giảng viên "${record.fullName || record.username}" khỏi bộ môn?`}
                          onConfirm={() => handleRemoveTeacher(record.id)}
                          okText="Gỡ"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                        >
                          <Button size="small" type="text" danger>
                            Gỡ khỏi BM
                          </Button>
                        </Popconfirm>
                      ),
                    },
                  ]}
                />
              </div>

              {/* Danh sách Môn học trực thuộc */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 mb-3 text-sm flex items-center gap-1.5">
                  <BookOutlined className="text-blue-500" />
                  Môn học do Bộ môn phụ trách ({selectedDeptDetail.courses?.length || 0})
                </h4>
                {selectedDeptDetail.courses && selectedDeptDetail.courses.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedDeptDetail.courses.map((course: any) => (
                      <div key={course.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-800 text-xs line-clamp-1">{course.title}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{course.lessonCount || 0} bài học</div>
                        </div>
                        <Tag color={course.status === 'active' ? 'green' : 'default'} className="text-[10px] m-0">
                          {course.status === 'active' ? 'Đang mở' : 'Bản nháp'}
                        </Tag>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic bg-slate-50 p-3 rounded-lg text-center">
                    Chưa có môn học nào được gán cho bộ môn này.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </Drawer>

        {/* Modal Chọn Giảng viên để thêm vào bộ môn */}
        <Modal
          title={`Thêm Giảng viên vào ${selectedDeptDetail?.name}`}
          open={addTeacherModalOpen}
          onOk={handleAddTeachersToDept}
          onCancel={() => setAddTeacherModalOpen(false)}
          confirmLoading={addingTeachers}
          okText="Thêm vào bộ môn"
          cancelText="Hủy"
          width={560}
          destroyOnClose
        >
          <div className="py-4 space-y-3">
            <Text className="text-sm">
              Chọn một hoặc nhiều Giảng viên để phân công trực thuộc <strong>{selectedDeptDetail?.name}</strong>:
            </Text>
            <Select
              mode="multiple"
              showSearch
              placeholder="Tìm kiếm và chọn giảng viên..."
              style={{ width: '100%' }}
              value={selectedTeacherIds}
              onChange={setSelectedTeacherIds}
              filterOption={(input, option) =>
                ((option?.label ?? '') as string).toLowerCase().includes(input.toLowerCase())
              }
              options={teachersList.map((t) => {
                const currentDeptId = t.departmentId;
                const isAlreadyInThisDept = currentDeptId === selectedDeptDetail?.id;
                return {
                  value: t.id,
                  disabled: isAlreadyInThisDept,
                  label: `${t.fullName ? `${t.fullName} (@${t.username})` : t.username}${
                    isAlreadyInThisDept ? ' (Đã ở bộ môn này)' : ''
                  }`,
                };
              })}
              maxTagCount="responsive"
              size="large"
            />
            <Text type="secondary" className="text-xs block mt-2">
              💡 Lưu ý: Mỗi giảng viên chỉ trực thuộc 1 Bộ môn chính. Nếu chọn giảng viên đã thuộc bộ môn khác, hệ thống sẽ tự động cập nhật chuyển sang bộ môn này.
            </Text>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default AdminDepartments;
