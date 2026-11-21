import React, { useState } from 'react';
import { Form, Input, Button, Card, Radio, message, Typography } from 'antd';
import { UserOutlined, LockOutlined, BookOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';

const { Text } = Typography;

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyData, setVerifyData] = useState<{ userId: string; email: string } | null>(null);
  const { login, verifyEmail } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const result = await login(values.username, values.password);
      if (result && result.success) {
        message.success('Đăng nhập thành công!');
        navigate('/dashboard');
      } else if (result && result.needsVerification) {
        setVerifyData({ userId: result.userId, email: result.email });
        setIsVerifying(true);
        message.info('Vui lòng kiểm tra email để lấy mã xác nhận.');
      } else {
        message.error('Đăng nhập thất bại. Vui lòng thử lại.');
      }
    } catch {
      message.error('Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (values: { code: string }) => {
    if (!verifyData) return;
    setLoading(true);
    try {
      const success = await verifyEmail(verifyData.userId, values.code);
      if (success) {
        message.success('Xác nhận email và đăng nhập thành công!');
        navigate('/dashboard');
      } else {
        message.error('Mã xác nhận không đúng hoặc đã hết hạn.');
      }
    } catch {
      message.error('Mã xác nhận không đúng hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="mx-auto relative z-10 flex flex-col justify-center items-center text-white p-12">
          <div className="text-6xl mb-6">🎓</div>
          <h1 className="text-4xl font-bold mb-4 text-center">
            Học viện Katori Edu
          </h1>
          <p className="text-xl text-white/80 text-center max-w-md">
            Khơi nguồn tri thức - Kiến tạo tương lai. Nền tảng quản lý đào tạo toàn diện dành riêng cho Giảng viên và Học viên.
          </p>


        </div>

        {/* Decorative Elements */}
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-xl animate-fade-in">
          <div className="text-center mb-8">
            <div className="lg:hidden text-5xl mb-4">📚</div>
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Chào mừng trở lại
            </h2>
            <p className="text-muted-foreground">
              {isVerifying ? 'Xác nhận danh tính của bạn' : ''}
            </p>
          </div>

          <Card className="shadow-card border-0">
            {!isVerifying ? (
              <Form
                name="login"
                onFinish={onFinish}
                layout="vertical"
                size="large"
                initialValues={{ username: '', password: '' }}
              >
                <Form.Item
                  name="username"
                  label="Email"
                  rules={[
                    { required: true, message: 'Vui lòng nhập Email!' },
                  ]}
                >
                  <Input
                    prefix={<UserOutlined className="text-muted-foreground" />}
                    placeholder="Nhập email "
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  label="Mật khẩu"
                  rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
                >
                  <Input.Password
                    prefix={<LockOutlined className="text-muted-foreground" />}
                    placeholder="Nhập mật khẩu"
                  />
                </Form.Item>

                <div className="flex justify-between items-center mb-6">
                  <a className="text-primary hover:text-primary-dark cursor-pointer" onClick={() => navigate('/forgot-password')}>
                    Quên mật khẩu?
                  </a>
                </div>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    className="w-full h-12 text-base font-medium"
                    icon={<BookOutlined />}
                  >
                    Đăng nhập
                  </Button>
                </Form.Item>
              </Form>
            ) : (
              <Form
                name="verify"
                onFinish={onVerify}
                layout="vertical"
                size="large"
              >
                <div className="mb-6 text-center">
                  <Text>
                    Vì đây là lần đăng nhập đầu tiên, một mã xác nhận gồm 6 chữ số đã được gửi đến email <strong>{verifyData?.email}</strong>.
                  </Text>
                </div>
                <Form.Item
                  name="code"
                  label="Mã xác nhận"
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

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    className="w-full h-12 text-base font-medium"
                  >
                    Xác nhận
                  </Button>
                </Form.Item>
                <div className="text-center">
                  <Button type="link" onClick={() => setIsVerifying(false)} disabled={loading}>
                    Quay lại đăng nhập
                  </Button>
                </div>
              </Form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
