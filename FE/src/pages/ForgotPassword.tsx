import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';

const { Title, Text } = Typography;

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  const onFinishEmail = async (values: { emailOrUsername: string }) => {
    setLoading(true);
    try {
      const res = await apiFetch<any>('/forgot-password', {
        method: 'POST',
        body: JSON.stringify(values),
      });

      if (res.data?.email) {
        setEmail(res.data.email);
        setIsVerifying(true);
        message.success('Mã OTP đã được gửi đến email của bạn.');
      } else {
        // Fallback for security (if user not found, we still pretend it succeeded)
        setIsVerifying(true);
        message.success('Nếu tài khoản tồn tại, email chứa mã OTP đã được gửi.');
      }
    } catch (error: any) {
      if (error?.statusCode === 429 || error?.message?.includes('quá nhiều lần') || error?.message?.includes('Throttler')) {
        message.error('Bạn đã yêu cầu gửi mã OTP quá nhiều lần. Vui lòng thử lại sau 5 phút.');
      } else {
        setIsVerifying(true);
        message.success('Nếu tài khoản tồn tại, email chứa mã OTP đã được gửi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onFinishReset = async (values: any) => {
    setLoading(true);
    try {
      await apiFetch('/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: values.code,
          newPassword: values.password
        }),
      });

      message.success('Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.');
      navigate('/login');
    } catch (error: any) {
      message.error(error.message || 'Mã xác nhận không hợp lệ hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-xl rounded-2xl border-0">
        {!isVerifying ? (
          <>
            <div className="text-center mb-8">
              <Title level={2} className="!mb-2">Quên mật khẩu</Title>
              <Text type="secondary">
                Nhập email của bạn để nhận mã khôi phục
              </Text>
            </div>

            <Form
              name="forgot_password"
              layout="vertical"
              onFinish={onFinishEmail}
              size="large"
            >
              <Form.Item
                name="emailOrUsername"
                rules={[
                  { required: true, message: 'Vui lòng nhập Email của bạn!' },
                ]}
              >
                <Input 
                  prefix={<MailOutlined className="text-gray-400" />} 
                  placeholder="Email" 
                />
              </Form.Item>

              <Form.Item className="mb-4">
                <Button type="primary" htmlType="submit" className="w-full" loading={loading}>
                  Gửi mã xác nhận
                </Button>
              </Form.Item>
              
              <div className="text-center">
                <Text type="secondary">Nhớ lại mật khẩu? </Text>
                <Button type="link" className="p-0" onClick={() => navigate('/login')}>
                  Đăng nhập ngay
                </Button>
              </div>
            </Form>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <Title level={2} className="!mb-2">Đặt lại mật khẩu</Title>
              <Text type="secondary">
                Một mã xác nhận gồm 6 chữ số đã được gửi đến email {email ? <strong>{email}</strong> : 'của bạn'}.
              </Text>
            </div>

            <Form
              name="reset_password"
              layout="vertical"
              onFinish={onFinishReset}
              size="large"
            >
              <Form.Item
                name="code"
                label="Mã xác nhận (OTP)"
                rules={[
                  { required: true, message: 'Vui lòng nhập mã xác nhận!' },
                  { len: 6, message: 'Mã xác nhận phải gồm 6 chữ số' }
                ]}
              >
                <Input
                  prefix={<MailOutlined className="text-muted-foreground" />}
                  placeholder="Nhập mã 6 số"
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Mật khẩu mới"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
                  { min: 6, message: 'Mật khẩu phải dài ít nhất 6 ký tự!' }
                ]}
              >
                <Input.Password 
                  prefix={<LockOutlined className="text-gray-400" />} 
                  placeholder="Mật khẩu mới" 
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Xác nhận mật khẩu"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Hai mật khẩu không khớp nhau!'));
                    },
                  }),
                ]}
              >
                <Input.Password 
                  prefix={<LockOutlined className="text-gray-400" />} 
                  placeholder="Xác nhận mật khẩu mới" 
                />
              </Form.Item>

              <Form.Item className="mb-4">
                <Button type="primary" htmlType="submit" className="w-full" loading={loading}>
                  Đổi mật khẩu
                </Button>
              </Form.Item>
              
              <div className="text-center">
                <Button type="link" onClick={() => setIsVerifying(false)} disabled={loading}>
                  Nhập lại email khác
                </Button>
              </div>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
};

export default ForgotPassword;
