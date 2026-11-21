import React, { useState } from 'react';
import { Card, Radio, Button, Space, Typography, Result, Divider, Modal, Table, Tag, Tabs } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, SendOutlined, RetweetOutlined, HistoryOutlined } from '@ant-design/icons';
import { apiFetch } from '@/lib/api';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

interface Question {
    id: string;
    content: string;
    options: string[];
    correctAnswer: number;
}

interface QuizPlayerProps {
    quiz: {
        id: string;
        title: string;
        questions: Question[];
    };
    onComplete: () => void;
    onNext?: () => void;
}

const QuizPlayer: React.FC<QuizPlayerProps> = ({ quiz, onComplete, onNext }) => {
    const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<{ [key: string]: number }>({});
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [pastAttempts, setPastAttempts] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [showOnlyWrong, setShowOnlyWrong] = useState(false);

    const fetchHistory = async () => {
        if (!quiz?.id) return;
        try {
            const res = await apiFetch<any[]>(`/quiz-attempts?quizId=${quiz.id}`);
            setPastAttempts(res.data || []);
        } catch (e) {
            console.error('Error fetching quiz history:', e);
        }
    };

    // Shuffle helper (Fisher-Yates)
    const shuffleArray = (array: any[]) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    const initializeQuiz = () => {
        if (!quiz || !quiz.questions) return;

        // Shuffle questions
        const sQuestions = shuffleArray(quiz.questions).map((q: Question) => {
            const originalCorrectText = q.options[q.correctAnswer];
            const sOptions = shuffleArray(q.options);
            const newCorrectIdx = sOptions.indexOf(originalCorrectText);

            return {
                ...q,
                options: sOptions,
                correctAnswer: newCorrectIdx
            };
        });

        setShuffledQuestions(sQuestions);
        setAnswers({});
        setSubmitted(false);
        setScore(0);
        fetchHistory();
    };

    React.useEffect(() => {
        initializeQuiz();
    }, [quiz]);

    const handleOptionChange = (questionId: string, optionIndex: number) => {
        if (submitted) return;
        setAnswers({ ...answers, [questionId]: optionIndex });
    };

    const handleSubmit = async () => {
        let correctCount = 0;
        shuffledQuestions.forEach((q) => {
            if (answers[q.id] === q.correctAnswer) {
                correctCount++;
            }
        });

        const finalScore = Number(((correctCount / shuffledQuestions.length) * 10).toFixed(1));
        const passed = finalScore >= 8.0;
        
        setScore(finalScore);
        setSubmitted(true);
        setSaving(true);

        try {
            await apiFetch('/quiz-attempts', {
                method: 'POST',
                body: JSON.stringify({
                    quizId: quiz.id,
                    score: finalScore,
                    totalCorrect: correctCount,
                    passed: passed,
                    answers: answers
                })
            });
            fetchHistory();
        } catch (e) {
            console.error('Error saving quiz attempt:', e);
        } finally {
            setSaving(false);
        }

        if (passed) {
            onComplete();
        }
    };

    const handleRetry = () => {
        initializeQuiz();
    };

    const quizContent = (
        <div className="space-y-6">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex gap-2 overflow-x-auto flex-nowrap custom-scrollbar">
                {shuffledQuestions.map((q, qIdx) => {
                    const isAnswered = answers[q.id] !== undefined;
                    return (
                        <div
                            key={`nav-${q.id}`}
                            title={isAnswered ? `Câu ${qIdx + 1} đã trả lời` : `Câu ${qIdx + 1} chưa trả lời`}
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer transition-all border ${isAnswered ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-primary hover:text-primary'}`}
                            onClick={() => {
                                const el = document.getElementById(`question-${q.id}`);
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                            }}
                        >
                            {qIdx + 1}
                        </div>
                    );
                })}
            </div>

            <div id="quiz-scroll-container" className="p-8 space-y-8">
                {shuffledQuestions.map((q, index) => (
                    <div id={`question-${q.id}`} key={q.id} className="space-y-4 animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className="flex gap-3">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                                {index + 1}
                            </span>
                            <Title level={5} className="mt-1">{q.content}</Title>
                        </div>

                        <Radio.Group
                            className="w-full flex flex-col gap-3 ml-11"
                            onChange={(e) => handleOptionChange(q.id, e.target.value)}
                            value={answers[q.id]}
                        >
                            {q.options.map((option, optIdx) => {
                                const isSelected = answers[q.id] === optIdx;
                                return (
                                    <Radio
                                        key={optIdx}
                                        value={optIdx}
                                        className={`w-full m-0 rounded-xl border py-3 px-4 transition-all duration-200 flex items-center ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-200 bg-white hover:border-primary/50'}`}
                                    >
                                        <span className={`whitespace-normal text-left ml-1 ${isSelected ? 'text-primary font-medium' : 'text-slate-700'}`}>
                                            {option}
                                        </span>
                                    </Radio>
                                );
                            })}
                        </Radio.Group>
                    </div>
                ))}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <Text type="secondary">{Object.keys(answers).length} / {shuffledQuestions.length} đã trả lời</Text>
                <Button
                    type={Object.keys(answers).length < shuffledQuestions.length ? 'default' : 'primary'}
                    size="large"
                    icon={<SendOutlined />}
                    onClick={() => {
                        Modal.confirm({
                            title: 'Nộp bài trắc nghiệm',
                            content: 'Bạn đã hoàn thành các câu hỏi. Hãy nộp bài để xem kết quả nhé!',
                            onOk: handleSubmit,
                            okText: 'Nộp bài',
                            cancelText: 'Hủy',
                        });
                    }}
                    disabled={Object.keys(answers).length < shuffledQuestions.length}
                    className="rounded-xl px-10 h-12 shadow-md hover:shadow-lg transition-all"
                >
                    Nộp bài
                </Button>
            </div>
        </div>
    );

    const historyContent = (
        <div className="p-6 animate-fade-in">
            {pastAttempts.length > 0 ? (
                <Table
                    dataSource={pastAttempts}
                    rowKey="id"
                    pagination={{ pageSize: 8 }}
                    columns={[
                        {
                            title: 'Ngày làm bài',
                            dataIndex: 'createdAt',
                            key: 'createdAt',
                            render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm')
                        },
                        {
                            title: 'Số câu đúng',
                            key: 'correct',
                            render: (_, record) => `${record.totalCorrect} câu`
                        },
                        {
                            title: 'Điểm số',
                            dataIndex: 'score',
                            key: 'score',
                            render: (score) => (
                                <Text strong className={score >= 8.0 ? 'text-success' : 'text-warning'}>
                                    {score}
                                </Text>
                            )
                        },
                        {
                            title: 'Kết quả',
                            dataIndex: 'passed',
                            key: 'passed',
                            render: (passed) => (
                                <Tag color={passed ? 'success' : 'warning'}>
                                    {passed ? 'Đạt' : 'Chưa đạt'}
                                </Tag>
                            )
                        }
                    ]}
                />
            ) : (
                <div className="py-20 text-center text-slate-400">
                    <HistoryOutlined style={{ fontSize: 48 }} className="mb-4 block opacity-20" />
                    <p>Bạn chưa có lịch sử làm bài cho phần này.</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="animate-fade-in relative quiz-player-container">
            {submitted ? (
                <div className="pb-10">
                    <Result
                        status={score >= 8.0 ? "success" : "warning"}
                        title={`Kết quả: ${score} điểm`}
                        subTitle={score >= 8.0 ? "Chúc mừng! Bạn đã hoàn thành bài trắc nghiệm này." : "Bạn cần đạt trên 8.0 điểm để hoàn thành bài học."}
                        extra={[
                            onNext && score >= 8.0 && (
                                <Button key="next" type="primary" size="large" onClick={onNext}>
                                    Bài tiếp theo
                                </Button>
                            ),
                            <Button key="retry" icon={<RetweetOutlined />} onClick={handleRetry} loading={saving}>
                                Làm lại (Luyện tập thêm)
                            </Button>
                        ]}
                    />
                    {score < 10 && (
                        <div className="p-8 pt-0 text-left max-w-3xl mx-auto">
                            <div className="flex justify-between items-center mb-4">
                                <Divider className="flex-1 m-0 mr-4">Xem lại đáp án</Divider>
                                <Button 
                                    type={showOnlyWrong ? "primary" : "default"}
                                    onClick={() => setShowOnlyWrong(!showOnlyWrong)}
                                >
                                    Chỉ hiển thị câu sai
                                </Button>
                            </div>
                            {shuffledQuestions
                                .filter(q => showOnlyWrong ? answers[q.id] !== q.correctAnswer : true)
                                .map((q, idx) => {
                                    const isCorrect = answers[q.id] === q.correctAnswer;
                                    return (
                                        <div key={q.id} className="mb-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                                            <div className="font-medium mb-2">Câu hỏi: {q.content}</div>
                                            <div className="flex items-center gap-2">
                                                {isCorrect ? (
                                                    <CheckCircleOutlined className="text-success" />
                                                ) : (
                                                    <CloseCircleOutlined className="text-error" />
                                                )}
                                                <span className={isCorrect ? "text-success" : "text-error"}>
                                                    Bạn chọn: {q.options[answers[q.id]] || 'Chưa chọn'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            }
                        </div>
                    )}
                </div>
            ) : quizContent}
        </div>
    );
};

export default QuizPlayer;
