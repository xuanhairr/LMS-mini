import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Drawer, Form, notification, Space } from 'antd';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { apiFetch } from '../../lib/api';

interface Category {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export default function ManageCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  
  // State for Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form] = Form.useForm();
  const [drawerLoading, setDrawerLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<Category[]>('/categories');
      setCategories(res.data || []);
    } catch (error) {
      notification.error({ message: 'Lỗi khi tải danh sách danh mục' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAdd = () => {
    setEditingCategory(null);
    form.resetFields();
    setIsDrawerOpen(true);
  };

  const handleEdit = (record: Category) => {
    setEditingCategory(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
    });
    setIsDrawerOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa danh mục này?')) return;
    try {
      await apiFetch(`/categories/${id}`, { method: 'DELETE' });
      notification.success({ message: 'Đã xóa danh mục' });
      fetchCategories();
    } catch (error) {
      notification.error({ message: 'Lỗi khi xóa danh mục. Có thể danh mục đang được sử dụng.' });
    }
  };

  const handleSave = async (values: any) => {
    setDrawerLoading(true);
    try {
      const payload = {
        name: values.name.trim(),
        description: values.description?.trim() || '',
      };

      if (editingCategory) {
        await apiFetch(`/categories/${editingCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        notification.success({ message: 'Cập nhật thành công' });
      } else {
        await apiFetch('/categories', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        notification.success({ message: 'Thêm mới thành công' });
      }
      setIsDrawerOpen(false);
      fetchCategories();
    } catch (error: any) {
      notification.error({ 
        message: 'Lỗi lưu danh mục', 
        description: error.message || 'Đã xảy ra lỗi'
      });
    } finally {
      setDrawerLoading(false);
    }
  };

  const columns = [
    {
      title: 'Tên danh mục',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <strong className="text-primary">{text}</strong>,
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: Category) => (
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
            <h1 className="text-2xl font-bold text-gray-800 m-0">Quản lý Danh mục</h1>
            <p className="text-gray-500 m-0 mt-1">Thiết lập phân loại khóa học</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size="large">
            Thêm danh mục
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={categories}
          rowKey="id"
          loading={loading}
          pagination={false}
        />

        <Drawer
          title={editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
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
              name="name" 
              label="Tên danh mục" 
              rules={[{ required: true, message: 'Vui lòng nhập tên danh mục' }]}
            >
              <Input placeholder="Nhập tên danh mục (VD: Lập trình Web)..." />
            </Form.Item>
            
            <Form.Item 
              name="description" 
              label="Mô tả" 
            >
              <Input.TextArea placeholder="Mô tả thêm về danh mục..." rows={4} />
            </Form.Item>
          </Form>
        </Drawer>
      </div>
    </DashboardLayout>
  );
}
