import React, { useState, useEffect } from 'react';
import { Card, Progress, Row, Col, Statistic, List, Tag, Button, Spin, message, Alert } from 'antd';
import {
  BookOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  RightOutlined,
  PlayCircleOutlined,
  FileTextOutlined,

} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import dayjs from 'dayjs';

// =================== DEV FAKE DATA ===================
// Đặt thành true để test UI cảnh báo BTVN mà không cần API thật
const DEV_FAKE_HOMEWORK_WARNING = false;
// =====================================================



// Countdown component for urgent tasks
const Countdown: React.FC<{ deadlineTime: string }> = ({ deadlineTime }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const dl = new Date(deadlineTime);
      const diffMs = dl.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeLeft('Quá hạn');
        clearInterval(timer);
      } else {
        const h = Math.floor(diffMs / (3600 * 1000));
        const m = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
        const s = Math.floor((diffMs % (60 * 1000)) / 1000);
        setTimeLeft(`${h}h ${m}m ${s}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [deadlineTime]);

  return <span>{timeLeft}</span>;
};

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [coursesData, setCoursesData] = useState<any[]>([]);
  const [enrollmentsCount, setEnrollmentsCount] = useState(0);
  const [completedCoursesCount, setCompletedCoursesCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0); // Optional
  const [overdueCount, setOverdueCount] = useState(0); // Used for hwLateCount
  const [lessonLateCount, setLessonLateCount] = useState(0);
  const [urgentTasks, setUrgentTasks] = useState<any[]>([]);
  const [nextLesson, setNextLesson] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch courses
      const res = await apiFetch<any>(`/courses/my-courses`);
      const data = res.data || [];
      setCoursesData(data);

      const completedCount = data.filter((item: any) => item.progress === 100).length;

      setCompletedCoursesCount(completedCount);
      setEnrollmentsCount(data.length);

      // Nếu bật fake data để test UI
      if (DEV_FAKE_HOMEWORK_WARNING) {
        const now = new Date();
        const fakeUrgentDeadline1 = new Date(now.getTime() + 3 * 3600 * 1000); // 3 giờ nữa
        const fakeUrgentDeadline2 = new Date(now.getTime() + 20 * 3600 * 1000); // 20 giờ nữa
        const fakeOverdueDeadline = new Date(now.getTime() - 5 * 3600 * 1000); // 5 giờ trước

        setPendingCount(5);
        setOverdueCount(2);
        setUrgentTasks([
          {
            id: 'fake-hw-1',
            title: '[Easy] Bài tập HTML/CSS cơ bản',
            deadline: fakeUrgentDeadline1.toISOString(),
            sessionNo: 3,
            courseId: 'fake-course-1',
            classId: 'fake-class-1',
          },
          {
            id: 'fake-hw-2',
            title: '[Medium] Xây dựng React Component',
            deadline: fakeUrgentDeadline2.toISOString(),
            sessionNo: 5,
            courseId: 'fake-course-1',
            classId: 'fake-class-1',
          },
        ]);
        setNextLesson({
          courseId: 'fake-course-1',
          courseTitle: 'ReactJs - Lập trình web',
          lessonId: 'fake-lesson-1',
          lessonTitle: 'React Hooks - useState và useEffect',
          sessionNo: 4,
        });
        setLoading(false);
        return;
      }

      // Fetch assignments and find next lesson
      const enrollRes = await apiFetch<any>(`/enrollments?where[studentId]=${user?.id}&include[course]=true`);
      const enrollments = enrollRes.data || [];
      let pending = 0; // Vẫn giữ logic tính nhưng có thể không hiển thị
      let lessonLate = 0;
      let hwLate = 0;
      const urgent: any[] = [];
      let firstUncompleted: any = null;

      await Promise.all(enrollments.map(async (e: any) => {
        if (!e.classId || !e.course?.id) return;
        
        try {
          const [classRes, lessonsRes, subsRes, progressRes] = await Promise.all([
            apiFetch<any>(`/classes/${e.classId}?include[schedule]=true`),
            apiFetch<any>(`/lessons?courseId=${e.course.id}&sortBy=order&sortOrder=asc`),
            apiFetch<any>(`/upload/class/${e.classId}/my-submissions`),
            apiFetch<any[]>(`/progresses/by-course?courseId=${e.course.id}&studentId=${user?.id}`)
          ]);

          const classData = classRes.data;
          const lessons = lessonsRes.data || [];
          const submissions = subsRes.data || [];
          const progresses = progressRes.data || [];

          const dates: Date[] = [];
          const hasSchedule = !!(classData?.startDate && classData.schedule?.dayOfWeek);
          
          if (hasSchedule) {
            const start = new Date(classData.startDate);
            const end = classData.endDate ? new Date(classData.endDate) : null;
            const daysOfWeek = classData.schedule.dayOfWeek;
            const jsDays = daysOfWeek.map((d: number) => (d === 8 ? 0 : d - 1));
            
            let current = new Date(start);
            while (dates.length < (classData.sessionCount || classData.course?.lessonCount || 30) + 5) {
              if (end && current > end) break;
              if (jsDays.includes(current.getDay())) {
                dates.push(new Date(current));
              }
              current.setDate(current.getDate() + 1);
            }
          }

          const now = new Date();

          lessons.forEach((lesson: any, idx: number) => {
            const sessionNo = idx + 1;
            
            const matchingProgresses = progresses.filter((pr: any) => (pr.lesson?.id || pr.lessonId) === lesson.id);
            const totalRequiredItems = (lesson.videos?.length || 0) + (lesson.quizzes?.length || 0);
            const isLessonCompleted = matchingProgresses.some((p: any) => 
              p.completed || (p.completedItems && p.completedItems.length > 0 && (totalRequiredItems === 0 || p.completedItems.length >= totalRequiredItems))
            );

            if (!isLessonCompleted && !firstUncompleted) {
              firstUncompleted = {
                courseId: e.course?.id,
                courseTitle: e.course?.title,
                lessonId: lesson.id,
                lessonTitle: lesson.title,
                sessionNo: sessionNo
              };
            }

            const hasVideoOrQuiz = (lesson.videos && lesson.videos.length > 0) || (lesson.quizzes && lesson.quizzes.length > 0);

            if (!isLessonCompleted && hasSchedule && dates[idx] && hasVideoOrQuiz) {
              const videoDeadline = new Date(dates[idx]);
              if (classData?.schedule?.startTime) {
                const [h, m] = classData.schedule.startTime.split(':');
                videoDeadline.setHours(Number(h), Number(m), 0, 0);
              }
              const diffHVideo = (videoDeadline.getTime() - now.getTime()) / 3600000;

              if (videoDeadline < now) {
                lessonLate++;
                urgent.push({
                  id: `video-${lesson.id}`,
                  type: 'VIDEO',
                  title: `[Video/Quiz] ${lesson.title}`,
                  deadline: videoDeadline.toISOString(),
                  sessionNo: sessionNo,
                  courseId: e.course?.id,
                  classId: e.classId,
                  isOverdue: true,
                });
              } else if (diffHVideo > 0 && diffHVideo <= 24) {
                pending++;
                urgent.push({
                  id: `video-${lesson.id}`,
                  type: 'VIDEO',
                  title: `[Video/Quiz] ${lesson.title}`,
                  deadline: videoDeadline.toISOString(),
                  sessionNo: sessionNo,
                  courseId: e.course?.id,
                  classId: e.classId,
                  isOverdue: false,
                });
              } else {
                pending++;
              }
            }

            const hasHomework = lesson.homeworks && lesson.homeworks.length > 0;
            if (!hasHomework) return;

            const lessonDate = hasSchedule ? dates[idx] : null;
            const lessonAlreadyTaught = lessonDate ? lessonDate < now : false;

            if (!lessonAlreadyTaught) return;

            const hasDeadlineInfo = hasSchedule && dates[sessionNo] !== undefined;

            lesson.homeworks.forEach((hw: any) => {
              const isSubmitted = submissions.some((s: any) => s.homeworkId === hw.id);
              if (isSubmitted) return;

              pending++;

              if (hasDeadlineInfo) {
                const deadline = new Date(dates[sessionNo]);
                if (classData?.schedule?.startTime) {
                  const [h, m] = classData.schedule.startTime.split(':');
                  deadline.setHours(Number(h), Number(m), 0, 0);
                }
                deadline.setHours(deadline.getHours() - 12);

                const diffH = (deadline.getTime() - now.getTime()) / 3600000;

                if (deadline < now) {
                  hwLate++;
                  urgent.push({
                    id: `hw-${hw.id}`,
                    type: 'BTVN',
                    title: `[BTVN] ${hw.title}`,
                    deadline: deadline.toISOString(),
                    sessionNo: sessionNo,
                    courseId: e.course?.id,
                    classId: e.classId,
                    isOverdue: true,
                  });
                } else if (diffH > 0 && diffH <= 24) {
                  urgent.push({
                    id: `hw-${hw.id}`,
                    type: 'BTVN',
                    title: `[BTVN] ${hw.title}`,
                    deadline: deadline.toISOString(),
                    sessionNo: sessionNo,
                    courseId: e.course?.id,
                    classId: e.classId,
                    isOverdue: false,
                  });
                }
              }
            });
          });
        } catch (err) {
          console.error("Error fetching class assignments data", err);
        }
      }));

      setPendingCount(pending);
      setOverdueCount(hwLate); // Tạm thời map sang state cũ
      setLessonLateCount(lessonLate); // Phải tạo thêm state này
      setUrgentTasks(urgent);
      setNextLesson(firstUncompleted);

    } catch (error) {
      console.error(error);
      message.error("Lỗi tải dữ liệu dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Lời chào */}
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Xin chào, {user?.fullName || user?.username}! 👋
        </h1>
        <p className="text-muted-foreground text-sm">
          Chúc bạn một ngày học tập hiệu quả.
        </p>
      </div>

      {/* 💡 Gợi ý cho bạn - DỮ LIỆU THẬT */}
      <Card
        title={
          <span className="text-lg font-semibold">
            💡 Gợi ý cho bạn
          </span>
        }
        className="border-0 shadow-soft"
      >
        {nextLesson ? (
          <div className="bg-primary-light rounded-lg p-4 border border-primary/20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">📚</div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    Học tiếp: {nextLesson.lessonTitle}
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Khóa học: {nextLesson.courseTitle} (Buổi {nextLesson.sessionNo})
                  </p>
                </div>
              </div>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => navigate(`/student/course/${nextLesson.courseId}/learning/${nextLesson.lessonId}`)}
              >
                Học tiếp ngay
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🎉</div>
              <div>
                <h4 className="font-medium text-green-800 mb-1">
                  Tuyệt vời! Bạn đã hoàn thành tất cả bài học.
                </h4>
                <p className="text-green-600 text-sm">
                  Hãy tiếp tục duy trì phong độ và ôn tập lại kiến thức nhé.
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Main Grid: 2 Columns */}
      <Row gutter={[24, 24]}>
        {/* Left Column (Main Content) - 16/24 */}
        <Col xs={24} lg={16} className="space-y-6">

          {/* Stats Cards */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Card className="card-hover border-0 shadow-soft">
                <Statistic
                  title="Khóa học đã đăng ký"
                  value={enrollmentsCount}
                  prefix={<BookOutlined className="text-primary" />}
                  valueStyle={{ color: 'hsl(var(--primary))' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card className="card-hover border-0 shadow-soft">
                <Statistic
                  title="Khóa học hoàn thành"
                  value={completedCoursesCount}
                  prefix={<TrophyOutlined className="text-success" />}
                  valueStyle={{ color: 'hsl(var(--success))' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card className="card-hover border-0 shadow-soft">
                <Statistic
                  title="Bài học hoàn thành muộn"
                  value={lessonLateCount}
                  prefix={<ClockCircleOutlined className="text-orange-500" />}
                  valueStyle={{ color: '#f97316' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card className="card-hover border-0 shadow-soft">
                <Statistic
                  title="Bài tập hoàn thành muộn"
                  value={overdueCount}
                  prefix={<ClockCircleOutlined className="text-red-500" />}
                  valueStyle={{ color: '#ef4444' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Biểu đồ hoạt động tuần */}
          {/* <Card title={<span className="text-lg font-semibold">📈 Hoạt động tuần này</span>} className="border-0 shadow-soft">
            <p className="text-xs text-muted-foreground mb-4">Số bài học đã hoàn thành mỗi ngày</p>
            <div className="flex justify-between items-end h-40 pt-4 px-4 bg-gray-50 rounded-lg">
              {[
                { day: 'T2', val: 2 },
                { day: 'T3', val: 3 },
                { day: 'T4', val: 0 },
                { day: 'T5', val: 4 },
                { day: 'T6', val: 1 },
                { day: 'T7', val: 5 },
                { day: 'CN', val: 0 }
              ].map((item) => (
                <div key={item.day} className="flex flex-col items-center gap-2">
                  <div 
                    className="bg-primary/80 hover:bg-primary w-8 rounded-t-md transition-all cursor-pointer" 
                    style={{ height: `${(item.val / 5) * 100}px` }}
                    title={`${item.val} bài học`}
                  ></div>
                  <span className="text-xs text-muted-foreground font-medium">{item.day}</span>
                </div>
              ))}
            </div>
          </Card> */}

          {/* Danh sách khóa học */}
          <Card
            title={
              <span className="text-lg font-semibold">
                <BookOutlined className="mr-2 text-primary" />
                Khóa học của tôi
              </span>
            }
            extra={<a className="text-primary" onClick={() => navigate('/student/my-courses')}>Xem tất cả</a>}
            className="border-0 shadow-soft"
          >
            <List
              dataSource={coursesData}
              renderItem={(course) => (
                <List.Item
                  className="!border-b !border-border hover:bg-muted/50 rounded-lg cursor-pointer transition-colors -mx-2 px-2"
                  onClick={() => navigate(`/student/course/${course.id}`)}
                >
                  <List.Item.Meta
                    avatar={
                      <img
                        src={course.coverImage || 'https://via.placeholder.com/150'}
                        alt={course.title}
                        className="w-20 h-14 rounded-lg object-cover"
                      />
                    }
                    title={
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-foreground">
                          {course.title}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {course.completedLessons}/{course.totalLessons} bài học
                        </span>
                      </div>
                    }
                    description={
                      <div className="space-y-2">
                        <Progress
                          percent={course.progress}
                          size="small"
                          strokeColor="hsl(var(--primary))"
                        />
                      </div>
                    }
                  />
                  <RightOutlined className="text-muted-foreground ml-4" />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* Right Column (Sidebar) - 8/24 */}
        <Col xs={24} lg={8} className="space-y-6">

          {/* Widget Việc cần làm ngay */}
          <Card
            title={
              <span className="text-lg font-semibold text-red-600">
                ⚡ Việc cần làm ngay
              </span>
            }
            extra={
              <Button 
                type="link" 
                size="small" 
                icon={<FileTextOutlined />}
                onClick={() => navigate('/student/assignments')}
                className="text-primary p-0"
              >
                Xem tất cả
              </Button>
            }
            className="border-0 shadow-soft"
          >
            {urgentTasks.length > 0 ? (
              <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: 2 }}>
                <List
                  dataSource={urgentTasks}
                  renderItem={(item: any) => (
                    <List.Item 
                      className={`!border-b !border-border last:!border-0 !px-0 cursor-pointer rounded-lg transition-colors px-2 ${
                        item.isOverdue ? 'hover:bg-red-50' : 'hover:bg-orange-50'
                      }`}
                      onClick={() => {
                        if (item.type === 'VIDEO') {
                          navigate(`/student/course/${item.courseId}/learning/${item.id.replace('video-', '')}`);
                        } else {
                          navigate('/student/assignments');
                        }
                      }}
                    >
                      <div className="space-y-1.5 w-full py-1">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-medium text-sm text-foreground flex-1 leading-tight">
                            Buổi {item.sessionNo}: {item.title}
                          </span>
                          {item.isOverdue
                            ? <Tag color="red" className="text-[10px] px-1 py-0 flex-shrink-0">Quá hạn</Tag>
                            : <Tag color="orange" className="text-[10px] px-1 py-0 flex-shrink-0">Sắp hết hạn</Tag>
                          }
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Hạn nộp:</span>
                          <span className={`font-medium ${item.isOverdue ? 'text-red-500' : 'text-orange-500'}`}>
                            {dayjs(item.deadline).format('HH:mm DD/MM/YYYY')}
                          </span>
                        </div>
                        {item.isOverdue ? (
                          <div className="text-xs text-red-500 font-semibold">
                            ⚠️ Đã quá hạn — nộp muộn vẫn được tính
                          </div>
                        ) : (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Còn lại:</span>
                            <span className="text-orange-500 font-bold">
                              <Countdown deadlineTime={item.deadline} />
                            </span>
                          </div>
                        )}
                      </div>
                    </List.Item>
                  )}
                />
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                🎉 Tuyệt vời! Bạn không có bài tập nào cần nộp.
              </div>
            )}
          </Card>


        </Col>
      </Row>
    </div>
  );
};

export default StudentDashboard;
