import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import CodePlayground from '@/components/learning/CodePlayground';
import { Typography, Breadcrumb } from 'antd';
import { useNavigate } from 'react-router-dom';
import { CodeOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const CodePlaygroundPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                {/* Header & Breadcrumb */}
                <div>
                    <Breadcrumb items={[
                        { title: 'Trang chủ', onClick: () => navigate('/dashboard'), className: 'cursor-pointer' },
                        { title: 'Thực hành Code trực tuyến' }
                    ]} />
                    <div className="flex items-center gap-3 mt-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xl">
                            <CodeOutlined />
                        </div>
                        <div>
                            <Title level={3} className="m-0">Trình thực hành Code (Web Playground)</Title>
                            <Paragraph type="secondary" className="m-0 text-sm">
                                Biên tập và thực thi mã nguồn HTML/CSS/JavaScript trực tiếp trên trình duyệt bằng nhân Monaco Editor
                            </Paragraph>
                        </div>
                    </div>
                </div>

                {/* Playground */}
                <CodePlayground initialTemplate="web" />
            </div>
        </DashboardLayout>
    );
};

export default CodePlaygroundPage;
