import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Tag, Space, message, Upload, InputNumber, Radio, Row, Col, Drawer, Alert } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UploadOutlined,
  BookOutlined,
  UnorderedListOutlined,
  SearchOutlined,
  FilterOutlined,
  CopyOutlined,
  MoreOutlined,
  ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Select, DatePicker, Dropdown } from 'antd';
import dayjs from 'dayjs';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiFetch } from '@/lib/api';
import { CLOUDINARY_CONFIG } from '@/lib/cloudinary';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

interface GradeConfigForm {
    attendanceWeight: number;
    homeworkWeight: number;
    quizWeight: number;
    examWeight: number;
    passingScore: number;
}

// Define Course Interface based on Backend Schema
export interface Course {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string; // Mapped to coverImage
  startDate?: string;
  endDate?: string;
  duration?: number;
  lessonCount?: number;
  status: "active" | "draft" | "archived";
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
  teacherId?: string;
  teacher?: { id: string, username: string, fullName?: string };
  creator?: { id: string, username: string, fullName?: string };
  categoryId?: string;
  category?: { id: string, name: string };
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}p ${secs}s`;
};

// Hàm trích xuất publicId từ URL Cloudinary
const extractPublicId = (url: string) => {
  if (!url) return null;
  const parts = url.split('/upload/');
  if (parts.length > 1) {
    const pathAndFile = parts[1].split('/').slice(1).join('/');
    const publicId = pathAndFile.split('.')[0];
    return publicId;
  }
  return null;
};

const ManageCourses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [categories, setCategories] = useState<any[]>([]);

  const [teachers, setTeachers] = useState<any[]>([]);
  const [teacherSearchLoading, setTeacherSearchLoading] = useState(false);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Trạng thái cho việc chọn ảnh bìa (chưa upload)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const canCreateCourse = user?.role === 'ADMIN' || user?.role === 'HEAD_STAFF' || user?.role === 'TEACHER';
  const canManageTeacher = user?.role === 'ADMIN' || user?.role === 'HEAD_STAFF';

  // Trạng thái số lớp đang hoạt động theo từng khóa
  const [courseClassCounts, setCourseClassCounts] = useState<Record<string, { active: number; total: number }>>({});

  // Cấu hình điểm Khóa học
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);
  const [selectedCourseIdForConfig, setSelectedCourseIdForConfig] = useState<string | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configForm] = Form.useForm<GradeConfigForm>();

  const openGradeConfig = async (courseId: string) => {
    setSelectedCourseIdForConfig(courseId);
    setConfigDrawerOpen(true);
    setConfigLoading(true);
    try {
      const res = await apiFetch<GradeConfigForm>(`/grading/config/course/${courseId}`);
      if (res.data) {
        configForm.setFieldsValue(res.data);
      } else {
        configForm.setFieldsValue({
          attendanceWeight: 10, homeworkWeight: 30,
          quizWeight: 20, examWeight: 40, passingScore: 5
        });
      }
    } catch {
      message.error("Không thể tải cấu hình điểm");
    } finally {
      setConfigLoading(false);
    }
  };

  const handleSaveGradeConfig = async (values: GradeConfigForm) => {
    if (!selectedCourseIdForConfig) return;
    const total = values.attendanceWeight + values.homeworkWeight + values.quizWeight + values.examWeight;
    if (Math.abs(total - 100) > 0.01) {
      message.error(`Tổng tỉ trọng phải bằng 100%. Hiện tại: ${total}%`);
      return;
    }
    setConfigLoading(true);
    try {
      await apiFetch(`/grading/config/course/${selectedCourseIdForConfig}`, {
        method: 'PUT',
        body: JSON.stringify(values),
      });
      message.success('Đã lưu cấu hình điểm khóa học!');
      setConfigDrawerOpen(false);
    } catch (e: any) {
      message.error(e?.message || 'Lỗi khi lưu cấu hình');
    } finally {
      setConfigLoading(false);
    }
  };

  // Input States (Controlled by inputs)
  const [searchInput, setSearchInput] = useState('');
  const [statusInput, setStatusInput] = useState<string | null>(null);
  const [teacherInput, setTeacherInput] = useState<string | null>(null);
  const [dateRangeInput, setDateRangeInput] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  // Fetch Courses from API
  const fetchCourses = async (queryParams?: string) => {
    setLoading(true);
    try {
      const endpoint = queryParams ? `/courses?${queryParams}` : '/courses';
      const res = await apiFetch<Course[]>(endpoint);
      const coursesData = Array.isArray(res.data) ? res.data : [];
      setCourses(coursesData);
      // Fetch class counts for each course
      fetchCourseClassCounts(coursesData.map(c => c.id));
    } catch (error) {
      console.error('Error fetching courses:', error);
      message.error('Không thể tải danh sách khóa học');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'STAFF' || user.role === 'STUDENT')) {
      message.error('Bạn không có quyền truy cập trang quản lý khóa học');
      navigate('/dashboard');
      return;
    }
    fetchCourses();
    
    // Fetch categories
    apiFetch<any[]>('/categories')
      .then(res => setCategories(res.data || []))
      .catch(console.error);
  }, [user, navigate]);

  const fetchCourseClassCounts = async (courseIds: string[]) => {
    if (!courseIds.length) return;
    try {
      const res = await apiFetch<any>(`/classes?take=500`);
      const classes = res.data?.items || (Array.isArray(res.data) ? res.data : []);
      const counts: Record<string, { active: number; total: number }> = {};
      for (const id of courseIds) {
        const courseClasses = classes.filter((c: any) => c.courseId === id);
        counts[id] = {
          active: courseClasses.filter((c: any) => ['gathering', 'ready', 'active'].includes(c.status)).length,
          total: courseClasses.length,
        };
      }
      setCourseClassCounts(counts);
    } catch (e) {
      // fail silently
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();

    if (searchInput) {
      params.append('where[title][contains]', searchInput);
      params.append('where[title][mode]', 'insensitive');
    }

    if (statusInput) {
      params.append('where[status][equals]', statusInput);
    }

    if (teacherInput) {
      params.append('where[teacher][id]', teacherInput);
    }

    if (dateRangeInput && dateRangeInput[0] && dateRangeInput[1]) {
      // Use dayjs objects directly to get ISO strings
      const start = dateRangeInput[0].startOf('day').toISOString();
      const end = dateRangeInput[1].endOf('day').toISOString();
      params.append('where[createdAt][gte]', start);
      params.append('where[createdAt][lte]', end);
    }

    fetchCourses(params.toString());
  };

  const handleReset = () => {
    setSearchInput('');
    setStatusInput(null);
    setTeacherInput(null);
    setDateRangeInput(null);
    fetchCourses();
  };

  const fetchTeachers = async (searchVal?: string) => {
    setTeacherSearchLoading(true);
    try {
      if (searchVal) {
        const [resUsername, resFullName] = await Promise.all([
          apiFetch<any>(`/users?where[roles][has]=TEACHER&where[username][contains]=${searchVal}&take=20`),
          apiFetch<any>(`/users?where[roles][has]=TEACHER&where[fullName][contains]=${searchVal}&take=20`)
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

  const handleSearchDebounced = (value: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchTeachers(value);
    }, 500);
  };

  useEffect(() => {
    if (canCreateCourse) {
      fetchTeachers();
    }
  }, [canCreateCourse]);

  // Hàm xóa ảnh cũ không còn dùng nữa (nếu có)
  const handleDeleteOldImage = async (url: string) => {
    const publicId = extractPublicId(url);
    if (publicId) {
      try {
        await apiFetch(`/upload/cloudinary?publicId=${publicId}&resourceType=image`, { method: 'DELETE' });
      } catch (error) {
        console.error('Lỗi khi xóa ảnh cũ:', error);
      }
    }
  };

  const handleAdd = () => {
    setEditingCourse(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    form.resetFields();
    
    const initialValues: any = { status: "draft" };
    if (!canManageTeacher && user?.id) {
      initialValues.teacherId = user.id;
      if (!teachers.some(t => t.id === user.id)) {
        setTeachers(prev => [{ id: user.id, fullName: user.fullName, username: user.username }, ...prev]);
      }
    }
    form.setFieldsValue(initialValues);
    setIsModalOpen(true);
  };

  const handleEdit = (record: Course) => {
    setEditingCourse(record);
    setSelectedFile(null);
    setPreviewUrl(record.coverImage || null);

    if (record.teacher && !teachers.some(t => t.id === record.teacher?.id)) {
      setTeachers(prev => [record.teacher, ...prev]);
    }

    form.setFieldsValue({
      ...record,
      teacherId: record.teacherId || record.teacher?.id,
      categoryId: record.category?.id
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: 'Bạn có chắc chắn muốn xóa khóa học này?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const res = await apiFetch<any>(`/courses/${id}`, { method: 'DELETE' });
          setCourses(courses.filter(c => c.id !== id));
          message.success(res.message || 'Xóa khóa học thành công!');
        } catch (error) {
          message.error('Lỗi khi xóa khóa học');
        }
      },
    });
  };

  const handleClone = async (id: string) => {
    try {
      setLoading(true);
      const res = await apiFetch<any>(`/courses/${id}/clone`, { method: 'POST' });
      message.success(res.message || 'Nhân bản khóa học thành công!');
      fetchCourses();
    } catch (error) {
      message.error(error.message || 'Lỗi khi nhân bản khóa học');
    } finally {
      setLoading(false);
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      let finalCoverImage = editingCourse?.coverImage || null;

      // Xử lý upload ảnh nếu có chọn ảnh mới
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );
        const uploadData = await uploadRes.json();

        if (!uploadData.secure_url) {
          throw new Error('Lỗi tải ảnh lên Cloudinary');
        }
        finalCoverImage = uploadData.secure_url;

        // Nếu sửa và có ảnh cũ -> xóa ảnh cũ
        if (editingCourse && editingCourse.coverImage) {
          await handleDeleteOldImage(editingCourse.coverImage);
        }
      } else if (editingCourse && editingCourse.coverImage && !previewUrl) {
        // Trường hợp xóa ảnh cũ mà không chọn ảnh mới
        finalCoverImage = null;
        await handleDeleteOldImage(editingCourse.coverImage);
      }

      const courseData = {
        ...values,
        coverImage: finalCoverImage,
        teacher: values.teacherId ? { id: values.teacherId } : undefined,
      };

      // Remove the flat teacherId as we are using the teacher object for connection
      delete (courseData as any).teacherId;

      if (editingCourse) {
        // Update
        const res = await apiFetch<Course>(`/courses/${editingCourse.id}`, {
          method: 'PATCH',
          body: JSON.stringify(courseData)
        });
        message.success('Cập nhật khóa học thành công!');
      } else {
        // Create
        const res = await apiFetch<Course>(`/courses`, {
          method: 'POST',
          body: JSON.stringify(courseData)
        });
        message.success('Thêm khóa học thành công!');
      }
      fetchCourses();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Save error:', error);
      message.error('Có lỗi xảy ra khi lưu khóa học');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Khóa học',
      key: 'course',
      render: (_: any, record: Course) => (
        <div className="flex items-center gap-3">
          <img
            src={record.coverImage || "https://via.placeholder.com/150"}
            alt={record.title}
            className="w-20 h-14 rounded-lg object-cover"
          />
          <div>
            <div className="font-medium text-foreground">{record.title}</div>
            {(() => {
              const counts = courseClassCounts[record.id];
              if (!counts || counts.active === 0) return null;
              return (
                <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                  🏫 {counts.active} lớp đang hoạt động
                </span>
              );
            })()}
          </div>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: string, record: Course) => {
        const counts = courseClassCounts[record.id];
        const hasActiveClasses = counts && counts.active > 0;
        const isArchived = status === 'archived';
        return (
          <div className="flex flex-col gap-1">
            <Tag color={status === "active" ? "green" : status === "draft" ? "orange" : "red"}>
              {status === "active" ? "Công khai" : status === "draft" ? "Bản nháp" : "Đã đóng"}
            </Tag>
            {isArchived && hasActiveClasses && (
              <span className="text-xs text-red-500 font-medium">⚠️ Đã đóng nhưng còn lớp chạy!</span>
            )}
          </div>
        );
      },
    },
    {
      title: 'Danh mục',
      dataIndex: ['category', 'name'],
      key: 'category',
      render: (categoryName: string) => categoryName ? <Tag color="blue">{categoryName}</Tag> : <span className="text-gray-400">Trống</span>,
    },
    {
      title: 'Thời lượng',
      dataIndex: 'duration',
      key: 'duration',
      render: (val: number) => val ? formatDuration(val) : '0p 0s'
    },
    {
      title: 'Bài học',
      dataIndex: 'lessonCount', // Use lessonCount from backend if available, or lessons.length
      key: 'lessonCount',
      render: (value: number) => `${value || 0} bài`,
    },
    {
      title: 'Người phụ trách',
      dataIndex: ['teacher', 'username'],
      key: 'teacher',
      render: (text: string, record: Course) => text ? <Tag color="blue">{record.teacher?.fullName || text}</Tag> : <span className="text-muted-foreground text-xs italic">Chưa gán</span>
    },
    {
      title: 'Người tạo',
      key: 'creator',
      render: (_: any, record: Course) => {
        const creator = record.creator;
        const name = creator?.fullName || creator?.username;
        return name ? (
          <Tag color={record.creator ? "purple" : "default"}>
            {name}
          </Tag>
        ) : (
          <span className="text-muted-foreground text-xs italic"></span>
        );
      }
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => new Date(val).toLocaleDateString('vi-VN')
    },
    {
      title: 'Người cập nhật',
      key: 'updater',
      render: (_: any, record: any) => {
        const name = record.updater?.fullName || record.updater?.username;
        return name ? (
          <Tag color="cyan">
            {name}
          </Tag>
        ) : (
          <span className="text-muted-foreground text-xs italic"></span>
        );
      }
    },
    {
      title: 'Ngày cập nhật',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (val: string) => <span className="text-slate-600">{new Date(val).toLocaleDateString('vi-VN')}</span>
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 120,
      align: 'center' as const,
      fixed: 'right' as const,
      render: (_: any, record: Course) => {
        const isTeacherOnly = user?.role === 'TEACHER';
        const isAssignedTeacher = isTeacherOnly && (record.teacherId === user?.id || record.teacher?.id === user?.id);
        const canEdit = !isTeacherOnly || isAssignedTeacher;

        const menuItems = [
          ...(canEdit ? [
            {
              key: 'edit',
              icon: <EditOutlined />,
              label: 'Chỉnh sửa nhanh',
              onClick: () => handleEdit(record),
            }
          ] : []),
          {
            key: 'lessons',
            icon: <UnorderedListOutlined />,
            label: 'Quản lý bài học',
            onClick: () => navigate(`/teacher/course/${record.id}`),
          },
          ...(canEdit ? [
            {
              key: 'clone',
              icon: <CopyOutlined />,
              label: 'Tạo bản sao',
              onClick: () => handleClone(record.id),
            }
          ] : []),
          ...(user?.role === 'ADMIN' || user?.role === 'HEAD_STAFF' || (user?.role === 'TEACHER' && (record.teacherId === user?.id || record.teacher?.id === user?.id)) ? [
            {
              key: 'grade_config',
              icon: <SettingOutlined />,
              label: 'Cấu hình điểm',
              onClick: () => openGradeConfig(record.id),
            }
          ] : []),
          {
            type: 'divider' as const,
          },
          ...(user?.role === 'ADMIN' || user?.role === 'STAFF' || user?.role === 'HEAD_STAFF' ? [
            {
              key: 'delete',
              icon: <DeleteOutlined />,
              label: 'Xóa',
              danger: true,
              onClick: () => handleDelete(record.id),
            }
          ] : []),
        ];

        return (
          <Dropdown menu={{ items: menuItems }} trigger={['hover']} placement="bottomRight">
            <Button type="text" size="small" icon={<MoreOutlined />} style={{ fontSize: '18px' }} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quản lý khóa học</h1>
            <p className="text-muted-foreground">Tạo, chỉnh sửa và quản lý các khóa học của bạn</p>
          </div>
          {canCreateCourse && (
            <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleAdd}>
              Tạo khóa học mới
            </Button>
          )}
        </div>

        <Card className="border-0 shadow-soft">
          <div className="mb-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <Form form={form} layout="vertical" onFinish={handleSearch}>
              <Row gutter={[16, 16]} align="bottom">
                {/* Col 1: Search */}
                <Col xs={24} sm={12} lg={6}>
                  <Form.Item label="Tìm kiếm" className="mb-0">
                    <Input
                      placeholder="Tên khóa học..."
                      prefix={<SearchOutlined className="text-slate-400" />}
                      allowClear
                      value={searchInput}
                      onChange={e => setSearchInput(e.target.value)}
                      onPressEnter={handleSearch}
                    />
                  </Form.Item>
                </Col>

                {/* Col 2: Status */}
                <Col xs={24} sm={12} lg={6}>
                  <Form.Item label="Trạng thái" className="mb-0">
                    <Select
                      placeholder="Tất cả trạng thái"
                      className="w-full"
                      allowClear
                      value={statusInput}
                      onChange={val => setStatusInput(val)}
                      options={[
                        { label: 'Bản nháp', value: 'draft' },
                        { label: 'Công khai', value: 'active' },
                        { label: 'Đã đóng', value: 'archived' },
                      ]}
                    />
                  </Form.Item>
                </Col>

                {/* Col 3: Teacher */}
                <Col xs={24} sm={12} lg={6}>
                  <Form.Item label="Người phụ trách" className="mb-0">
                    <Select
                      placeholder="Giảng viên"
                      className="w-full"
                      allowClear={canManageTeacher}
                      showSearch
                      onSearch={handleSearchDebounced}
                      filterOption={false}
                      value={!canManageTeacher ? user?.id : teacherInput}
                      onChange={val => setTeacherInput(val)}
                      disabled={!canManageTeacher}
                    >
                      {!canManageTeacher ? (
                        <Select.Option value={user?.id}>{user?.fullName || user?.username}</Select.Option>
                      ) : (
                        teachers.map(t => <Select.Option key={t.id} value={t.id}>{t.fullName || t.username}</Select.Option>)
                      )}
                    </Select>
                  </Form.Item>
                </Col>

                {/* Col 5: Date Range (Wraps to Row 2) */}
                <Col xs={24} sm={12} lg={6}>
                  <Form.Item label="Khoảng ngày tạo" className="mb-0">
                    <RangePicker
                      className="w-full"
                      placeholder={['Từ ngày', 'Đến ngày']}
                      format="DD/MM/YYYY"
                      value={dateRangeInput}
                      onChange={(values) => {
                        if (values && values[0] && values[1]) {
                          setDateRangeInput([values[0], values[1]]);
                        } else {
                          setDateRangeInput(null);
                        }
                      }}
                    />
                  </Form.Item>
                </Col>

                {/* Col 4: Buttons Group (Stays on Row 1) */}
                <Col span={24}>
                  <Space className="w-full justify-end">
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SearchOutlined />}
                      onClick={handleSearch}
                      className="rounded-lg px-6"
                    >
                      Tìm kiếm
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={handleReset}
                      className="rounded-lg text-slate-600 border-slate-200"
                    >
                      Đặt lại
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Form>
          </div>

          <Table
            dataSource={courses}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            loading={loading}
            scroll={{ x: 'max-content' }}
          />
        </Card>

        <Drawer
          title={
            <span>
              <BookOutlined className="mr-2" />
              {editingCourse ? 'Chỉnh sửa khóa học' : 'Tạo khóa học mới'}
            </span>
          }
          open={isModalOpen}
          onClose={() => !saving && setIsModalOpen(false)}
          width={600}
          footer={
            <div className="flex justify-end gap-2">
              <Button onClick={() => !saving && setIsModalOpen(false)}>
                Hủy
              </Button>
              <Button type="primary" onClick={handleModalOk} loading={saving}>
                {editingCourse ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </div>
          }
        >
          <Form form={form} layout="vertical" className="mt-4">
            <Form.Item
              name="title"
              label="Tên khóa học"
              rules={[{ required: true, message: 'Vui lòng nhập tên khóa học!' }]}
            >
              <Input placeholder="Nhập tên khóa học" />
            </Form.Item>

            <Form.Item
              name="description"
              label="Mô tả"
            >
              <TextArea rows={4} placeholder="Nhập mô tả khóa học" />
            </Form.Item>

            <Form.Item name="teacherId" label="Giảng viên phụ trách">
              <Select
                showSearch
                placeholder="Tìm kiếm giảng viên..."
                onSearch={handleSearchDebounced}
                filterOption={false}
                allowClear={canManageTeacher}
                loading={teacherSearchLoading}
                disabled={!canManageTeacher}
              >
                {teachers.map(t => <Select.Option key={t.id} value={t.id}>{t.fullName || t.username}</Select.Option>)}
              </Select>
            </Form.Item>

            <Form.Item name="categoryId" label="Danh mục">
              <Select
                placeholder="Chọn danh mục..."
                allowClear
              >
                {categories.map(c => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}
              </Select>
            </Form.Item>

            <div className="grid grid-cols-2 gap-4">
              <Form.Item name="status" label="Trạng thái" initialValue="draft">
                <Radio.Group disabled={!canCreateCourse || !editingCourse}>
                  <Radio value="draft">Bản nháp</Radio>
                  <Radio value="active">Công khai</Radio>
                  <Radio value="archived">Đã đóng</Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item label="Ảnh bìa">
                <Upload
                  accept="image/*"
                  maxCount={1}
                  showUploadList={false}
                  beforeUpload={(file) => {
                    setSelectedFile(file);
                    setPreviewUrl(URL.createObjectURL(file));
                    return false;
                  }}
                  className="w-full [&_.ant-upload]:w-full [&_.ant-upload]:block"
                >
                  {previewUrl ? (
                    <div className="relative group w-full aspect-video rounded-xl overflow-hidden border border-slate-200 cursor-pointer">
                      <img src={previewUrl} alt="cover" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          type="primary"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            setPreviewUrl(null);
                          }}
                        >
                          Xóa ảnh
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full py-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 hover:border-primary transition-colors flex flex-col items-center justify-center aspect-video cursor-pointer">
                      <PlusOutlined className="text-2xl text-slate-400 mb-2" />
                      <div className="text-slate-600 font-medium">Tải ảnh lên</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>
            </div>
          </Form>
        </Drawer>

      {/* Drawer: Cấu hình tỉ trọng điểm (Global cho Khóa học) */}
      <Drawer
        title="⚙️ Cấu hình điểm Khóa học"
        open={configDrawerOpen}
        onClose={() => setConfigDrawerOpen(false)}
        width={480}
        extra={
          <Button type="primary" onClick={() => configForm.submit()} loading={configLoading}>
            Lưu cấu hình
          </Button>
        }
      >
        <Alert
          type="info"
          showIcon
          message="Cấu hình này sẽ được áp dụng làm công thức tính điểm chung cho TẤT CẢ các lớp thuộc Khóa học này."
          className="mb-4"
        />
        <Alert
          type="warning"
          showIcon
          message="Tổng 4 tỉ trọng thành phần phải bằng đúng 100%"
          className="mb-4"
        />
        <Form form={configForm} layout="vertical" onFinish={handleSaveGradeConfig}>
          <Form.Item name="attendanceWeight" label="Tỉ trọng Chuyên cần (%)"
            rules={[{ required: true }]}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} suffix="%" />
          </Form.Item>
          <Form.Item name="homeworkWeight" label="Tỉ trọng Bài tập (%)"
            rules={[{ required: true }]}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} suffix="%" />
          </Form.Item>
          <Form.Item name="quizWeight" label="Tỉ trọng Quiz / Trắc nghiệm (%)"
            rules={[{ required: true }]}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} suffix="%" />
          </Form.Item>
          <Form.Item name="examWeight" label="Tỉ trọng Thi cuối khóa (%)"
            rules={[{ required: true }]}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} suffix="%" />
          </Form.Item>
          <div className="border-t border-gray-200 my-4"></div>
          <Form.Item name="passingScore" label="Điểm tổng tối thiểu để Đạt"
            rules={[{ required: true }]}>
            <InputNumber min={0} max={10} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Drawer>
      </div>
    </DashboardLayout>
  );
};

export default ManageCourses;
