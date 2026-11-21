import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Tag, Drawer, Form, notification, Space, Switch, TimePicker } from 'antd';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { apiFetch } from '../../lib/api';
import dayjs from 'dayjs';

interface Shift {
  id: string;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ManageShifts() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  
  // State for Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [form] = Form.useForm();
  const [drawerLoading, setDrawerLoading] = useState(false);

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<Shift[]>('/shifts');
      setShifts(res.data || []);
    } catch (error) {
      notification.error({ message: 'Lỗi khi tải danh sách ca học' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const handleAdd = () => {
    setEditingShift(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true });
    setIsDrawerOpen(true);
  };

  const handleEdit = (record: Shift) => {
    setEditingShift(record);
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      timeRange: [dayjs(record.startTime, 'HH:mm'), dayjs(record.endTime, 'HH:mm')],
      isActive: record.isActive
    });
    setIsDrawerOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa ca học này?')) return;
    try {
      await apiFetch(`/shifts/${id}`, { method: 'DELETE' });
      notification.success({ message: 'Đã xóa ca học' });
      fetchShifts();
    } catch (error) {
      notification.error({ message: 'Lỗi khi xóa ca học' });
    }
  };

  const handleSave = async (values: any) => {
    setDrawerLoading(true);
    try {
      const payload = {
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        startTime: values.timeRange[0].format('HH:mm'),
        endTime: values.timeRange[1].format('HH:mm'),
        isActive: values.isActive
      };

      if (editingShift) {
        await apiFetch(`/shifts/${editingShift.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        notification.success({ message: 'Cập nhật thành công' });
      } else {
        await apiFetch('/shifts', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        notification.success({ message: 'Thêm mới thành công' });
      }
      setIsDrawerOpen(false);
      fetchShifts();
    } catch (error: any) {
      notification.error({ 
        message: 'Lỗi lưu ca học', 
        description: error.message || 'Đã xảy ra lỗi'
      });
    } finally {
      setDrawerLoading(false);
    }
  };

  const columns = [
    {
      title: 'Mã ca',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => <strong className="text-primary">{text}</strong>,
    },
    {
      title: 'Tên ca',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Thời gian',
      key: 'time',
      render: (_: any, record: Shift) => (
        <span>{record.startTime} - {record.endTime}</span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Đang mở' : 'Đã khóa'}
        </Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: Shift) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 m-0">Quản lý ca học</h1>
            <p className="text-gray-500 m-0 mt-1">Thiết lập các khung giờ học chuẩn cho hệ thống</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size="large">
            Thêm ca học
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={shifts}
          rowKey="id"
          loading={loading}
          pagination={false}
        />

        <Drawer
          title={editingShift ? 'Chỉnh sửa ca học' : 'Thêm ca học mới'}
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          width={400}
          extra={
            <Space>
              <Button onClick={() => setIsDrawerOpen(false)}>Hủy</Button>
              <Button type="primary" onClick={() => form.submit()} loading={drawerLoading}>
                Lưu lại
              </Button>
            </Space>
          }
        >
          <Form form={form} layout="vertical" onFinish={handleSave}>
            <Form.Item 
              name="code" 
              label="Mã ca (VD: CA1)" 
              rules={[{ required: true, message: 'Vui lòng nhập mã ca' }]}
            >
              <Input placeholder="Nhập mã ca..." disabled={!!editingShift} />
            </Form.Item>
            
            <Form.Item 
              name="name" 
              label="Tên hiển thị (VD: Ca 1)" 
              rules={[{ required: true, message: 'Vui lòng nhập tên ca' }]}
            >
              <Input placeholder="Nhập tên hiển thị..." />
            </Form.Item>

            <Form.Item 
              name="timeRange" 
              label="Khung giờ (Bắt đầu - Kết thúc)" 
              rules={[{ required: true, message: 'Vui lòng chọn khung giờ' }]}
            >
              <TimePicker.RangePicker format="HH:mm" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="isActive" label="Trạng thái mở" valuePropName="checked">
              <Switch checkedChildren="Mở" unCheckedChildren="Khóa" />
            </Form.Item>
          </Form>
        </Drawer>
      </div>
    </DashboardLayout>
  );
}
