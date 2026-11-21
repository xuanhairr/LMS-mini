import React, { useState } from 'react';
import {
  Card, Row, Col, Avatar, Tag, Button, Divider, Form, Input, message, Modal, Space
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  LogoutOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';

const ROLE_LABEL: Record<string, { label: string; color: string }> = {
  ADMIN:      { label: 'Quản trị viên', color: 'red' },
  HEAD_STAFF: { label: 'Giáo vụ trưởng', color: 'purple' },
  STAFF:      { label: 'Giáo vụ', color: 'blue' },
  TEACHER:    { label: 'Giảng viên', color: 'cyan' },
  STUDENT:    { label: 'Học viên', color: 'green' },
};

const ProfilePage: React.FC = () => {
  const { user, logout, updateUserData } = useAuth();
  const navigate = useNavigate();
  const [pwForm] = Form.useForm();
  const [changingPw, setChangingPw] = useState(false);
  const [pwModalOpen, setPwModalOpen] = useState(false);

  const roleInfo = ROLE_LABEL[user?.role || ''] || { label: user?.role, color: 'default' };

  // ─── Đổi mật khẩu ───────────────────────────────────────────
  const handleChangePassword = async () => {
    try {
      const values = await pwForm.validateFields();
      if (values.newPassword !== values.confirmPassword) {
        message.error('Mật khẩu xác nhận không khớp!');
        return;
      }
      setChangingPw(true);

      await apiFetch(`/users/change-password`, {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });

      message.success('Đổi mật khẩu thành công!');
      pwForm.resetFields();
      setPwModalOpen(false);

      // Cập nhật lại context nếu cần
      updateUserData({ forcePasswordChange: false });
    } catch (err: any) {
      message.error(err?.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.');
    } finally {
      setChangingPw(false);
    }
  };

  // ─── Đăng xuất ──────────────────────────────────────────────
  const handleLogout = () => {
    Modal.confirm({
      title: 'Xác nhận đăng xuất',
      content: 'Bạn có chắc chắn muốn đăng xuất không?',
      okText: 'Đăng xuất',
      cancelText: 'Hủy',
      okType: 'danger',
      onOk() {
        logout();
        navigate('/login');
      },
    });
  };

  const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value?: string | null }> = ({ icon, label, value }) => (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-400 mb-0.5">{label}</div>
        <div className="font-medium text-slate-800 truncate">{value || <span className="text-slate-400 italic text-sm">Chưa cập nhật</span>}</div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-10">

        {/* ── Header card ── */}
        <Card className="border-0 shadow-soft overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-blue-50 to-indigo-50 px-6 py-8 -mx-6 -mt-6 mb-6">
            <div className="flex items-center gap-5">
              <Avatar
                size={88}
                src={user?.avatar}
                icon={<UserOutlined />}
                className="border-4 border-white shadow-lg flex-shrink-0"
              />
              <div>
                <h1 className="text-2xl font-bold text-slate-800 mb-1">
                  {user?.name || user?.username}
                </h1>
                <p className="text-slate-500 text-sm mb-2">{user?.email}</p>
                <Space>
                  <Tag color={roleInfo.color} className="font-medium">{roleInfo.label}</Tag>
                  <Tag color="green">Đang hoạt động</Tag>
                </Space>
              </div>
            </div>
          </div>

          {/* ── Thông tin cá nhân (chỉ đọc) ── */}
          <div>
            <h2 className="text-base font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <IdcardOutlined /> Thông tin tài khoản
            </h2>
            <InfoRow icon={<UserOutlined />}  label="Họ và tên"      value={user?.name} />
            <InfoRow icon={<MailOutlined />}  label="Email"          value={user?.email} />
            <InfoRow icon={<PhoneOutlined />} label="Số điện thoại"  value={user?.phoneNumber} />
            <InfoRow
              icon={<SafetyCertificateOutlined />}
              label="Vai trò"
              value={roleInfo.label}
            />
          </div>
        </Card>

        {/* ── Đổi mật khẩu ── */}
        <Card
          className="border-0 shadow-soft"
          title={
            <span className="flex items-center gap-2 text-base font-semibold text-slate-700">
              <LockOutlined /> Bảo mật
            </span>
          }
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-700">Mật khẩu</p>
              <p className="text-sm text-slate-400">Thay đổi mật khẩu đăng nhập của bạn</p>
            </div>
            <Button
              type="primary"
              icon={<LockOutlined />}
              onClick={() => { pwForm.resetFields(); setPwModalOpen(true); }}
            >
              Đổi mật khẩu
            </Button>
          </div>

          <Divider />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-red-600">Đăng xuất</p>
              <p className="text-sm text-slate-400">Kết thúc phiên làm việc hiện tại</p>
            </div>
            <Button danger icon={<LogoutOutlined />} onClick={handleLogout}>
              Đăng xuất
            </Button>
          </div>
        </Card>
      </div>

      {/* ── Modal đổi mật khẩu ── */}
      <Modal
        title={
          <span className="flex items-center gap-2">
            <LockOutlined className="text-primary" /> Đổi mật khẩu
          </span>
        }
        open={pwModalOpen}
        onCancel={() => setPwModalOpen(false)}
        onOk={handleChangePassword}
        okText="Xác nhận đổi"
        cancelText="Hủy"
        confirmLoading={changingPw}
        destroyOnClose
      >
        <Form form={pwForm} layout="vertical" className="mt-4">
          <Form.Item
            name="currentPassword"
            label="Mật khẩu hiện tại"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu hiện tại"
              iconRender={v => v ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
            />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
              iconRender={v => v ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu mới"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập lại mật khẩu mới"
              iconRender={v => v ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
            />
          </Form.Item>
        </Form>
      </Modal>
    </DashboardLayout>
  );
};

export default ProfilePage;
