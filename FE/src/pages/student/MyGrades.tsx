import React, { useState, useEffect, useCallback } from 'react';
import {
    Card, Table, Typography, Tag, Row, Col, Statistic,
    Empty, Spin, Progress, Tooltip, Collapse, Divider
} from 'antd';
import {
    TrophyOutlined, CheckCircleOutlined, CloseCircleOutlined,
    BookOutlined, CalendarOutlined
} from '@ant-design/icons';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiFetch } from '@/lib/api';

const { Title, Text } = Typography;

interface GradeConfig {
    attendanceWeight: number;
    homeworkWeight: number;
    quizWeight: number;
    examWeight: number;
    passingScore: number;
}

interface ClassResult {
    id: string;
    classId: string;
    studentId: string;
    attendanceScore: number | null;
    homeworkScore: number | null;
    quizScore: number | null;
    examScore: number | null;
    totalScore: number | null;
    isPassed: boolean | null;
    status: string;
    publishedAt: string | null;
    class: {
        id: string;
        title: string;
        course: {
            id: string;
            title: string;
            gradeConfig: GradeConfig | null;
        };
    };
}

const ScoreCell: React.FC<{ score: number | null; weight?: number }> = ({ score, weight }) => {
    if (score === null || score === undefined) {
        return <Tag color="default">Chưa có</Tag>;
    }
    const color = score >= 8 ? '#22c55e' : score >= 5 ? '#f59e0b' : '#ef4444';
    return (
        <div className="flex items-center gap-2">
            <Text strong style={{ color, fontSize: 16 }}>{score.toFixed(1)}</Text>
            {weight !== undefined && (
                <Text type="secondary" style={{ fontSize: 12 }}>({weight}%)</Text>
            )}
        </div>
    );
};

const MyGradesPage: React.FC = () => {
    const [results, setResults] = useState<ClassResult[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchResults = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch<ClassResult[]>('/grading/results/my');
            setResults(res.data || []);
        } catch { }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchResults(); }, [fetchResults]);

    const passCount = results.filter(r => r.isPassed === true).length;
    const failCount = results.filter(r => r.isPassed === false).length;

    const items = results.map(result => {
        const config = result.class?.course?.gradeConfig;
        const isPassed = result.isPassed;
        const totalScore = result.totalScore;

        const passColor = isPassed === true ? '#22c55e' : isPassed === false ? '#ef4444' : '#94a3b8';

        return {
            key: result.id,
            label: (
                <div className="flex justify-between items-center w-full pr-4">
                    <div className="flex items-center gap-3">
                        <BookOutlined style={{ color: '#6366f1' }} />
                        <div>
                            <Text strong>{result.class?.title}</Text>
                            <div>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {result.class?.course?.title}
                                </Text>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {totalScore !== null ? (
                            <>
                                <Tooltip title="Điểm tổng kết">
                                    <Text strong style={{ fontSize: 20, color: passColor }}>
                                        {totalScore.toFixed(1)}
                                    </Text>
                                </Tooltip>
                                {isPassed !== null && (
                                    isPassed
                                        ? <Tag color="success" icon={<CheckCircleOutlined />}>Đạt</Tag>
                                        : <Tag color="error" icon={<CloseCircleOutlined />}>Không Đạt</Tag>
                                )}
                            </>
                        ) : (
                            <Tag color="default">Chưa có kết quả</Tag>
                        )}
                    </div>
                </div>
            ),
            children: (
                <div className="px-4 py-2">
                    {/* Progress bar tổng quát */}
                    {totalScore !== null && (
                        <div className="mb-6">
                            <div className="flex justify-between mb-1">
                                <Text type="secondary">Điểm tổng kết</Text>
                                <Text strong style={{ color: passColor }}>{totalScore.toFixed(1)} / 10</Text>
                            </div>
                            <Progress
                                percent={totalScore * 10}
                                strokeColor={passColor}
                                showInfo={false}
                                strokeWidth={12}
                            />
                            <div className="flex justify-between mt-1">
                                <Text type="secondary" style={{ fontSize: 12 }}>0</Text>
                                {config && (
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Điểm đạt: {config.passingScore}
                                    </Text>
                                )}
                                <Text type="secondary" style={{ fontSize: 12 }}>10</Text>
                            </div>
                        </div>
                    )}

                    {/* Chi tiết từng đầu điểm */}
                    <Row gutter={[16, 16]}>
                        <Col xs={12} sm={6}>
                            <Card size="small" className="text-center border-dashed">
                                <div className="text-2xl mb-1">📅</div>
                                <Statistic
                                    title={<span style={{ fontSize: 12 }}>Chuyên cần{config ? ` (${config.attendanceWeight}%)` : ''}</span>}
                                    value={result.attendanceScore !== null ? result.attendanceScore.toFixed(1) : '-'}
                                    valueStyle={{ fontSize: 20, color: result.attendanceScore !== null && result.attendanceScore >= 5 ? '#22c55e' : '#ef4444' }}
                                />
                            </Card>
                        </Col>
                        <Col xs={12} sm={6}>
                            <Card size="small" className="text-center border-dashed">
                                <div className="text-2xl mb-1">📝</div>
                                <Statistic
                                    title={<span style={{ fontSize: 12 }}>Bài tập{config ? ` (${config.homeworkWeight}%)` : ''}</span>}
                                    value={result.homeworkScore !== null ? result.homeworkScore.toFixed(1) : '-'}
                                    valueStyle={{ fontSize: 20, color: result.homeworkScore !== null && result.homeworkScore >= 5 ? '#22c55e' : '#ef4444' }}
                                />
                            </Card>
                        </Col>
                        <Col xs={12} sm={6}>
                            <Card size="small" className="text-center border-dashed">
                                <div className="text-2xl mb-1">🧠</div>
                                <Statistic
                                    title={<span style={{ fontSize: 12 }}>Quiz{config ? ` (${config.quizWeight}%)` : ''}</span>}
                                    value={result.quizScore !== null ? result.quizScore.toFixed(1) : '-'}
                                    valueStyle={{ fontSize: 20, color: result.quizScore !== null && result.quizScore >= 5 ? '#22c55e' : '#ef4444' }}
                                />
                            </Card>
                        </Col>
                        <Col xs={12} sm={6}>
                            <Card size="small" className="text-center border-dashed">
                                <div className="text-2xl mb-1">🎯</div>
                                <Statistic
                                    title={<span style={{ fontSize: 12 }}>Thi cuối khóa{config ? ` (${config.examWeight}%)` : ''}</span>}
                                    value={result.examScore !== null ? result.examScore.toFixed(1) : '-'}
                                    valueStyle={{ fontSize: 20, color: result.examScore !== null && result.examScore >= 5 ? '#22c55e' : '#ef4444' }}
                                />
                            </Card>
                        </Col>
                    </Row>

                    {/* Công thức tính điểm */}
                    {config && totalScore !== null && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                📐 Công thức: Chuyên cần × {config.attendanceWeight}% + Bài tập × {config.homeworkWeight}% + Quiz × {config.quizWeight}% + Thi cuối × {config.examWeight}%
                                {' '}= <Text strong>{totalScore.toFixed(2)}</Text>
                                {' '}(Đạt nếu ≥ {config.passingScore})
                            </Text>
                        </div>
                    )}
                </div>
            )
        };
    });

    return (
        <DashboardLayout>
            <div className="space-y-6 p-6">
                <div>
                    <Title level={3} className="mb-0 flex items-center gap-2">
                        <TrophyOutlined style={{ color: '#f59e0b' }} /> Bảng điểm của tôi
                    </Title>
                    <Text type="secondary">Xem kết quả học tập và điểm số từng lớp đã đăng ký</Text>
                </div>

                {/* Tổng quan */}
                <Row gutter={16}>
                    <Col xs={8}>
                        <Card size="small">
                            <Statistic title="Tổng lớp có kết quả" value={results.length} suffix="lớp" />
                        </Card>
                    </Col>
                    <Col xs={8}>
                        <Card size="small">
                            <Statistic title="Đạt" value={passCount} valueStyle={{ color: '#22c55e' }} prefix={<CheckCircleOutlined />} />
                        </Card>
                    </Col>
                    <Col xs={8}>
                        <Card size="small">
                            <Statistic title="Không Đạt" value={failCount} valueStyle={{ color: '#ef4444' }} prefix={<CloseCircleOutlined />} />
                        </Card>
                    </Col>
                </Row>

                {/* Danh sách kết quả theo lớp */}
                {loading ? (
                    <div className="flex justify-center py-16"><Spin size="large" /></div>
                ) : results.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Chưa có kết quả học tập nào được công bố"
                    />
                ) : (
                    <Collapse
                        items={items}
                        accordion
                        className="bg-white rounded-xl shadow-sm"
                    />
                )}
            </div>
        </DashboardLayout>
    );
};

export default MyGradesPage;
