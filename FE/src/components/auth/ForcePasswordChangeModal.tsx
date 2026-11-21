import React, { useState } from 'react';
import { Modal, Form, Input, Button, message, Alert } from 'antd';
import { LockOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface ForcePasswordChangeModalProps {
    visible: boolean;
    onSuccess: () => void;
}

const ForcePasswordChangeModal: React.FC<ForcePasswordChangeModalProps> = ({ visible, onSuccess }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    const handleSubmit = async (values: any) => {
        setLoading(true);
        try {
            const res = await apiFetch<any>(`/users/${user?.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    password: values.newPassword,
                    forcePasswordChange: false,
                }),
            });
            message.success(res.message || 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại để cập nhật phiên làm việc.');
            onSuccess();
        } catch (error) {
            message.error('Lỗi khi đổi mật khẩu. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Yêu cầu đổi mật khẩu"
            open={visible}
            closable={false}
            maskClosable={false}
            footer={null}
            centered
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                className="space-y-4"
            >
                <Alert
                    message="Bảo mật tài khoản"
                    description="Đây là lần đầu tiên bạn đăng nhập hoặc quản trị viên đã yêu cầu bạn đổi mật khẩu. Vui lòng đặt mật khẩu mới để tiếp tục."
                    type="info"
                    showIcon
                    icon={<InfoCircleOutlined />}
                    className="mb-4"
                />

                <Form.Item
                    name="newPassword"
                    label="Mật khẩu mới"
                    rules={[
                        { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                        { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
                    ]}
                >
                    <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="Nhập mật khẩu mới"
                        size="large"
                    />
                </Form.Item>

                <Form.Item
                    name="confirmPassword"
                    label="Xác nhận mật khẩu mới"
                    dependencies={['newPassword']}
                    rules={[
                        { required: true, message: 'Vui lòng xác nhận mật khẩu' },
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
                        placeholder="Xác nhận mật khẩu"
                        size="large"
                    />
                </Form.Item>

                <Form.Item className="mb-0">
                    <Button
                        type="primary"
                        htmlType="submit"
                        block
                        size="large"
                        loading={loading}
                    >
                        Cập nhật mật khẩu
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ForcePasswordChangeModal;
