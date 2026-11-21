import React, { useState, useEffect, useCallback } from 'react';
import {
    Card, Table, Button, Drawer, Form, InputNumber, Typography, Tag,
    Statistic, Row, Col, Space, message, Tooltip, Spin, Progress,
    Divider, Alert, Popconfirm
} from 'antd';
import {
    TrophyOutlined, CalculatorOutlined, CheckCircleOutlined, FileTextOutlined,
    SettingOutlined, SendOutlined, ReloadOutlined, ExportOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface GradeConfigForm {
    attendanceWeight: number;
    homeworkWeight: number;
    quizWeight: number;
    examWeight: number;
    passingScore: number;
}

interface StudentResult {
    studentId: string;
    student: { id: string; fullName?: string; username: string; email?: string };
    attendanceScore: number | null;
    homeworkScore: number | null;
    quizScore: number | null;
    examScore: number | null;
    totalScore: number | null;
    isPassed: boolean | null;
    isEligibleForExam?: boolean | null;
    status: string;
}

interface ExamScoreRow {
    studentId: string;
    student: { id: string; fullName?: string; username: string; email?: string };
    score: number | null;
}

interface Props {
    classId: string;
    courseId: string;
    className?: string;
}

const GradeScoreTag: React.FC<{ score: number | null }> = ({ score }) => {
    if (score === null || score === undefined) return <Tag color="default">Chưa có</Tag>;
    const color = score >= 8 ? 'success' : score >= 5 ? 'warning' : 'error';
    return <Tag color={color}>{score.toFixed(1)}</Tag>;
};

export const GradingPanel: React.FC<Props> = ({ classId, courseId, className }) => {
    const { user } = useAuth();

    const [gradeConfig, setGradeConfig] = useState<GradeConfigForm | null>(null);

    const [results, setResults] = useState<StudentResult[]>([]);
    const [resultsLoading, setResultsLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [publishing, setPublishing] = useState(false);

    const [examScores, setExamScores] = useState<Record<string, number | null>>({});
    const [examRows, setExamRows] = useState<ExamScoreRow[]>([]);
    const [examDrawerOpen, setExamDrawerOpen] = useState(false);
    const [examLoading, setExamLoading] = useState(false);
    const [savingExam, setSavingExam] = useState(false);

    // ── Load cấu hình điểm ─────────────────────────────────────────
    const fetchConfig = useCallback(async () => {
        try {
            const res = await apiFetch<GradeConfigForm>(`/grading/config/course/${courseId}`);
            if (res.data) {
                setGradeConfig(res.data);
            }
        } catch { }
    }, [courseId]);

    // ── Load kết quả (merge với enrollments để luôn có đủ học viên) ──
    const fetchResults = useCallback(async () => {
        setResultsLoading(true);
        try {
            const [enrollRes, resData] = await Promise.all([
                apiFetch<any>(`/enrollments?where[classId][equals]=${classId}&take=200&include[student]=true`),
                apiFetch<StudentResult[]>(`/grading/results/class/${classId}`),
            ]);

            const enrollments: any[] = Array.isArray(enrollRes.data) ? enrollRes.data : (enrollRes.data?.items || []);
            const calculatedResults: StudentResult[] = resData.data || [];

            // Merge: mỗi học viên → tìm kết quả, nếu chưa có thì placeholder
            const merged: StudentResult[] = enrollments.map((enrollment: any) => {
                const student = enrollment.student;
                const found = calculatedResults.find(r => r.studentId === student?.id);
                if (found) return found;
                return {
                    studentId: student?.id,
                    student,
                    attendanceScore: null,
                    homeworkScore: null,
                    quizScore: null,
                    examScore: null,
                    totalScore: null,
                    isPassed: null,
                    status: 'draft',
                };
            });

            setResults(merged);
        } catch { }
        finally { setResultsLoading(false); }
    }, [classId]);

    // ── Load điểm thi (dùng danh sách từ enrollments để luôn đủ học viên) ──
    const fetchExamScores = useCallback(async () => {
        setExamLoading(true);
        try {
            const [enrollRes, examRes] = await Promise.all([
                apiFetch<any>(`/enrollments?where[classId][equals]=${classId}&take=200&include[student]=true`),
                apiFetch<ExamScoreRow[]>(`/grading/exam-scores/class/${classId}`),
            ]);

            const enrollments: any[] = Array.isArray(enrollRes.data) ? enrollRes.data : (enrollRes.data?.items || []);
            const examData: ExamScoreRow[] = examRes.data || [];

            // Build rows từ enrollment để luôn có đủ học viên
            const rows: ExamScoreRow[] = enrollments.map((e: any) => ({
                studentId: e.student?.id,
                student: e.student,
                score: null,
            }));
            setExamRows(rows);

            const map: Record<string, number | null> = {};
            examData.forEach(r => { map[r.student.id] = r.score; });
            setExamScores(map);
        } catch { }
        finally { setExamLoading(false); }
    }, [classId]);

    // ── Tính điểm tổng kết ────────────────────────────────────────
    const handleCalculate = async (silent: boolean = false) => {
        setCalculating(true);
        try {
            await apiFetch(`/grading/results/class/${classId}/calculate`, { method: 'POST' });
            if (!silent) message.success('Đã tính điểm tổng kết thành công!');
            fetchResults();
        } catch (e: any) {
            if (!silent) message.error(e?.message || 'Lỗi khi tính điểm');
        } finally {
            setCalculating(false);
        }
    };

    useEffect(() => {
        fetchConfig();
        // Tự động tính điểm ngầm khi mở bảng điểm
        handleCalculate(true);
        fetchExamScores();
    }, [classId]);

    // ── Công bố kết quả ───────────────────────────────────────────
    const handlePublish = async () => {
        setPublishing(true);
        try {
            await apiFetch(`/grading/results/class/${classId}/publish`, { method: 'POST' });
            message.success('Đã công bố kết quả cho học viên!');
            fetchResults();
        } catch (e: any) {
            message.error(e?.message || 'Lỗi khi công bố');
        } finally {
            setPublishing(false);
        }
    };

    // ── Lưu điểm thi ─────────────────────────────────────────────
    const handleSaveExamScores = async () => {
        setSavingExam(true);
        try {
            const scores = examRows.map(r => ({
                studentId: r.student.id,
                score: examScores[r.student.id] ?? 0,
            }));
            await apiFetch(`/grading/exam-scores/class/${classId}/bulk`, {
                method: 'POST',
                body: JSON.stringify({ scores }),
            });
            message.success('Đã lưu điểm thi!');
            setExamDrawerOpen(false);
            fetchExamScores();
        } catch {
            message.error('Lỗi khi lưu điểm thi');
        } finally {
            setSavingExam(false);
        }
    };

    // ── Export Excel ──────────────────────────────────────────────
    const handleExport = () => {
        const data = results.map((r, i) => ({
            'STT': i + 1,
            'Họ tên': r.student?.fullName || r.student?.username,
            'Email': r.student?.email,
            'Chuyên cần': r.attendanceScore ?? '-',
            'Bài tập': r.homeworkScore ?? '-',
            'Quiz': r.quizScore ?? '-',
            'Thi cuối khóa': r.examScore ?? '-',
            'Điểm tổng': r.totalScore ?? '-',
            'Kết quả': r.isPassed === null ? 'Chưa tính' : r.isPassed ? 'Đạt' : 'Không Đạt',
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [
            { wch: 5 },  // STT
            { wch: 30 }, // Họ tên
            { wch: 25 }, // Email
            { wch: 15 }, // Chuyên cần
            { wch: 15 }, // Bài tập
            { wch: 15 }, // Quiz
            { wch: 15 }, // Thi
            { wch: 15 }, // Tổng
            { wch: 15 }, // Kết quả
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Bảng Điểm');
        XLSX.writeFile(wb, `bang-diem-${className || classId}.xlsx`);
    };

    const handleExportEligible = () => {
        if (results.length === 0) {
            message.warning('Không có học viên nào!');
            return;
        }
        const data = results.map((r, i) => {
            let reason = '';
            if (r.isEligibleForExam === false) {
                if (r.attendanceScore === 0) {
                    reason = 'Nghỉ quá 20%';
                } else {
                    reason = 'Chưa hoàn thành đủ 100% E-learning (Video/Quiz)';
                }
            } else if (r.isEligibleForExam === null || r.isEligibleForExam === undefined) {
                reason = 'Chưa tính điểm';
            }
            
            return {
                'STT': i + 1,
                'Họ tên': r.student?.fullName || r.student?.username,
                'Email': r.student?.email,
                'Chuyên cần': r.attendanceScore ?? '-',
                'Bài tập': r.homeworkScore ?? '-',
                'Quiz': r.quizScore ?? '-',
                'Đủ ĐK Thi': r.isEligibleForExam ? 'Có' : (r.isEligibleForExam === false ? 'Không' : 'Chưa rõ'),
                'Lý do (nếu không)': reason,
            };
        });
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [
            { wch: 5 },  // STT
            { wch: 30 }, // Họ tên
            { wch: 25 }, // Email
            { wch: 15 }, // Chuyên cần
            { wch: 15 }, // Bài tập
            { wch: 15 }, // Quiz
            { wch: 15 }, // Đủ ĐK Thi
            { wch: 40 }, // Lý do
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'DS Dự thi');
        XLSX.writeFile(wb, `danh-sach-du-thi-${className || classId}.xlsx`);
    };

    // ── Thống kê ──────────────────────────────────────────────────
    const passCount = results.filter(r => r.isPassed === true).length;
    const publishedCount = results.filter(r => r.status === 'published').length;
    const passRate = results.length > 0 ? Math.round((passCount / results.length) * 100) : 0;

    // ── Columns bảng kết quả ──────────────────────────────────────
    const resultColumns = [
        {
            title: 'STT', key: 'stt', width: 55,
            render: (_: any, __: any, i: number) => i + 1
        },
        {
            title: 'Học viên', key: 'student',
            render: (_: any, r: StudentResult) => (
                <div>
                    <div className="font-medium">{r.student?.fullName || r.student?.username}</div>
                    <div className="text-xs text-gray-400">{r.student?.email}</div>
                </div>
            )
        },
        {
            title: () => (
                <Tooltip title={`Trọng số: ${gradeConfig?.attendanceWeight ?? 10}%`}>
                    <span>Chuyên cần ℹ️</span>
                </Tooltip>
            ),
            key: 'attendance',
            render: (_: any, r: StudentResult) => <GradeScoreTag score={r.attendanceScore} />
        },
        {
            title: () => (
                <Tooltip title={`Trọng số: ${gradeConfig?.homeworkWeight ?? 30}%`}>
                    <span>Bài tập ℹ️</span>
                </Tooltip>
            ),
            key: 'homework',
            render: (_: any, r: StudentResult) => <GradeScoreTag score={r.homeworkScore} />
        },
        {
            title: () => (
                <Tooltip title={`Trọng số: ${gradeConfig?.quizWeight ?? 20}%`}>
                    <span>Quiz ℹ️</span>
                </Tooltip>
            ),
            key: 'quiz',
            render: (_: any, r: StudentResult) => <GradeScoreTag score={r.quizScore} />
        },
        {
            title: () => (
                <Tooltip title={`Trọng số: ${gradeConfig?.examWeight ?? 40}%`}>
                    <span>Thi cuối ℹ️</span>
                </Tooltip>
            ),
            key: 'exam',
            render: (_: any, r: StudentResult) => <GradeScoreTag score={r.examScore} />
        },
        {
            title: 'Điểm tổng', key: 'total', sorter: (a: StudentResult, b: StudentResult) => (a.totalScore ?? 0) - (b.totalScore ?? 0),
            render: (_: any, r: StudentResult) => (
                r.totalScore !== null
                    ? <Typography.Text strong style={{ fontSize: 16, color: r.isPassed ? '#22c55e' : '#ef4444' }}>
                        {r.totalScore?.toFixed(1)}
                    </Typography.Text>
                    : <Tag>Chưa tính</Tag>
            )
        },
        {
            title: 'Kết quả', key: 'pass',
            render: (_: any, r: StudentResult) => {
                if (r.isPassed === null) return <Tag>Chưa tính</Tag>;
                return r.isPassed
                    ? <Tag color="success" icon={<CheckCircleOutlined />}>Đạt</Tag>
                    : <Tag color="error">Không Đạt</Tag>;
            }
        },
    ];

    // ── Columns bảng điểm thi ─────────────────────────────────────
    const examColumns = [
        { title: 'Họ tên', key: 'name', render: (_: any, r: ExamScoreRow) => r.student?.fullName || r.student?.username },
        { title: 'Username', dataIndex: ['student', 'username'] },
        {
            title: 'Điểm thi (0-10)', key: 'score',
            render: (_: any, r: ExamScoreRow) => (
                <InputNumber
                    min={0} max={10} step={0.1} precision={1}
                    style={{ width: 100 }}
                    value={examScores[r.student.id] ?? undefined}
                    onChange={(val) => setExamScores(prev => ({ ...prev, [r.student.id]: val }))}
                    placeholder="0-10"
                />
            )
        },
    ];

    return (
        <div className="space-y-4">
            {/* Thống kê tổng quan */}
            <Row gutter={16}>
                <Col span={6}>
                    <Card size="small" className="text-center">
                        <Statistic title="Tổng học viên" value={results.length} suffix="HV" />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small" className="text-center">
                        <Statistic title="Đạt" value={passCount} valueStyle={{ color: '#22c55e' }} prefix={<TrophyOutlined />} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small" className="text-center">
                        <Statistic title="Tỉ lệ đạt" value={passRate} suffix="%" />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small" className="text-center">
                        <Statistic 
                            title="Trạng thái" 
                            value={results.length > 0 && results[0].status === 'published' ? 'Đã công bố' : 'Chưa công bố'} 
                            valueStyle={{ color: results.length > 0 && results[0].status === 'published' ? '#3b82f6' : '#9ca3af', fontSize: '1.25rem' }} 
                        />
                    </Card>
                </Col>
            </Row>

            {/* Thanh công cụ */}
            <div className="flex flex-wrap gap-2 justify-between items-center">
                <Space wrap>
                    <Button icon={<FileTextOutlined />} onClick={() => setExamDrawerOpen(true)} type="primary" ghost>
                        Nhập điểm thi cuối khóa
                    </Button>
                </Space>
                <Space wrap>
                    <Button icon={<ReloadOutlined />} onClick={fetchResults}>Làm mới</Button>
                    <Button icon={<ExportOutlined />} onClick={handleExport} disabled={results.length === 0}>
                        Xuất Bảng Điểm
                    </Button>
                    <Button icon={<FileTextOutlined />} onClick={handleExportEligible} disabled={results.length === 0}>
                        Xuất DS Dự Thi
                    </Button>
                    <Popconfirm title="Tính toán lại toàn bộ điểm?" onConfirm={() => handleCalculate(false)}>
                        <Button icon={<CalculatorOutlined />} type="primary" loading={calculating}>
                            Tính điểm tổng kết
                        </Button>
                    </Popconfirm>
                    <Popconfirm
                        title="Công bố kết quả cho học viên xem?"
                        description="Học viên sẽ nhìn thấy điểm số của mình ngay lập tức."
                        onConfirm={handlePublish}
                    >
                        <Button icon={<SendOutlined />} type="primary" danger loading={publishing} disabled={results.length === 0}>
                            Công bố kết quả
                        </Button>
                    </Popconfirm>
                </Space>
            </div>

            {/* Bảng kết quả */}
            {gradeConfig && (
                <Alert
                    type="info"
                    showIcon
                    message={`Công thức: Chuyên cần ${gradeConfig.attendanceWeight}% + Bài tập ${gradeConfig.homeworkWeight}% + Quiz ${gradeConfig.quizWeight}% + Thi ${gradeConfig.examWeight}% | Điểm đạt: ≥ ${gradeConfig.passingScore}`}
                />
            )}
            <Table
                columns={resultColumns}
                dataSource={results}
                loading={resultsLoading}
                rowKey="studentId"
                size="small"
                pagination={{ pageSize: 20 }}
                rowClassName={(r: StudentResult) =>
                    r.isPassed === false ? 'bg-red-50' : r.isPassed === true ? 'bg-green-50' : ''
                }
            />

            {/* Drawer: Nhập điểm thi */}
            <Drawer
                title="📝 Nhập điểm thi cuối khóa"
                open={examDrawerOpen}
                onClose={() => setExamDrawerOpen(false)}
                width={600}
                extra={
                    <Button type="primary" onClick={handleSaveExamScores} loading={savingExam}>
                        Lưu điểm thi
                    </Button>
                }
            >
                <Alert
                    type="info"
                    showIcon
                    message="Nhập điểm thi (thang 0-10) cho từng học viên. Nhấn 'Lưu điểm thi' để lưu, sau đó bấm 'Tính điểm tổng kết' để cập nhật bảng kết quả."
                    className="mb-4"
                />
                <Table
                    columns={examColumns}
                    dataSource={examRows}
                    loading={examLoading}
                    rowKey={r => r.student.id}
                    size="small"
                    pagination={false}
                />
            </Drawer>
        </div>
    );
};
