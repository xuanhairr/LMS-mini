import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button, Typography } from 'antd';

const { Paragraph, Text } = Typography;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-slate-50 rounded-xl my-4">
          <Result
            status="error"
            title="Đã xảy ra sự cố khi hiển thị trang này"
            subTitle="Hệ thống đã ghi nhận lỗi. Bạn có thể tải lại trang hoặc liên hệ quản trị viên."
            extra={[
              <Button type="primary" key="reload" onClick={this.handleReset}>
                Tải lại trang
              </Button>,
              <Button key="back" onClick={() => window.history.back()}>
                Quay lại
              </Button>,
            ]}
          >
            {this.state.error && (
              <div className="text-left bg-white p-4 rounded-lg border border-red-100 max-w-2xl mx-auto mt-4 overflow-auto text-xs">
                <Paragraph>
                  <Text strong className="text-red-600">
                    {this.state.error.toString()}
                  </Text>
                </Paragraph>
              </div>
            )}
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}
