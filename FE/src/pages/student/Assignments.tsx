import React, { useState, useEffect } from 'react';
import { Card, Spin, message, Tag, Select, Table, Button, Typography, Breadcrumb } from 'antd';
import { ArrowRightOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

interface Enrollment {
  id: string;
  classId: string;
  course: {
    id: string;
    title: string;
  };
  class?: {
    title: string;
  };
}

const StudentAssignments: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Enrollment[]>([]);
  const [assignmentsMap, setAssignmentsMap] = useState<Record<string, any[]>>({});
  
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  useEffect(() => {
    if (user?.id) fetchEnrollments();
  }, [user?.id]);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<Enrollment[]>(`/enrollments?where[studentId]=${user?.id}&include[course]=true&include[class]=true`);
      const enrolledClasses = (res.data || []).filter(e => e.classId);
      setClasses(enrolledClasses);
      if (enrolledClasses.length > 0) {
        setSelectedClassId(enrolledClasses[0].classId);
      }

      const map: Record<string, any[]> = {};
      await Promise.all(enrolledClasses.map(async (cls) => {
        try {
          const [lessonsRes, subsRes] = await Promise.all([
            apiFetch<any>(`/lessons?courseId=${cls.course.id}&sortBy=order&sortOrder=asc`),
            apiFetch<any>(`/upload/class/${cls.classId}/my-submissions`)
          ]);

          const lessons = lessonsRes.data || [];
          const submissions = subsRes.data || [];

          const mappedAssignments = lessons.map((lesson: any, idx: number) => {
            const sessionNo = idx + 1;
            const hasHomework = lesson.homeworks && lesson.homeworks.length > 0;
            return {
              id: lesson.id,
              classId: cls.classId,
              courseId: cls.course.id,
              sessionNo,
              lesson,
              hasHomework,
              submissions: submissions.filter((s: any) => lesson.homeworks?.some((hw: any) => hw.id === s.homeworkId)),
            };
          });

          map[cls.classId] = mappedAssignments;
        } catch {
          map[cls.classId] = [];
        }
      }));
      setAssignmentsMap(map);
    } catch {
      message.error('Lỗi tải danh sách lớp học');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex justify-center items-center h-64"><Spin size="large" /></div>
    </DashboardLayout>
  );

  const renderSessionTable = (classId: string) => {
    const data = assignmentsMap[classId] || [];
    const columns = [
      {
        title: 'STT',
        key: 'index',
        width: 80,
        render: (_: any, __: any, index: number) => index + 1,
        className: 'font-semibold text-center text-primary'
      },
      {
        title: 'Session',
        key: 'session',
        render: (record: any) => (
          <Text strong>Session {record.sessionNo < 10 ? `0${record.sessionNo}` : record.sessionNo} - {record.lesson.title}</Text>
        )
      },
      {
        title: 'Bài đã nộp',
        key: 'submitted',
        align: 'center' as const,
        render: (record: any) => {
          if (!record.hasHomework) return <Text type="secondary">-</Text>;
          return <Text>{record.submissions.length} / {record.lesson.homeworks.length}</Text>;
        }
      },
      {
        title: 'Trạng thái',
        key: 'status',
        align: 'center' as const,
        render: (record: any) => {
          if (!record.hasHomework) return <Tag color="default">Không có BTVN</Tag>;
          if (record.submissions.length === record.lesson.homeworks.length) {
            return <Tag color="green">Hoàn thành</Tag>;
          }
          if (record.submissions.length > 0) {
            return <Tag color="orange">Đang làm</Tag>;
          }
          return <Tag color="red">Chưa hoàn thành</Tag>;
        }
      },
      {
        title: 'Hành động',
        key: 'action',
        align: 'right' as const,
        render: (record: any) => (
          <Button 
            type="link" 
            disabled={!record.hasHomework}
            onClick={() => setSelectedSession(record)}
          >
            Xem chi tiết <ArrowRightOutlined />
          </Button>
        )
      }
    ];

    return (
      <Card className="border-0 shadow-soft mt-6 overflow-hidden">
        <Table 
          columns={columns} 
          dataSource={data} 
          rowKey="id" 
          pagination={false}
          rowClassName={() => 'hover:bg-slate-50 transition-colors'}
        />
      </Card>
    );
  };

  const renderHomeworkTable = (session: any) => {
    const data = session.lesson.homeworks || [];
    const columns = [
      {
        title: 'STT',
        key: 'index',
        width: 80,
        render: (_: any, __: any, index: number) => index + 1,
        className: 'font-semibold text-center'
      },
      {
        title: 'Bài tập',
        key: 'homework',
        render: (record: any) => (
          <Text strong>{record.level ? `[${record.level}] ` : ''}{record.title}</Text>
        )
      },
      {
        title: 'Link GitHub/Bài làm',
        key: 'link',
        render: (record: any) => {
          const sub = session.submissions.find((s: any) => s.homeworkId === record.id);
          if (!sub || !sub.githubLink) return <Text type="secondary">-</Text>;
          return <a href={sub.githubLink} target="_blank" rel="noreferrer" className="text-blue-500 truncate inline-block max-w-[200px]">{sub.githubLink}</a>;
        }
      },
      {
        title: 'Trạng thái',
        key: 'status',
        align: 'center' as const,
        render: (record: any) => {
          const sub = session.submissions.find((s: any) => s.homeworkId === record.id);
          if (sub) {
            return sub.isLate ? <Tag color="orange">Đã nộp muộn</Tag> : <Tag color="green">Đã nộp</Tag>;
          }
          return <Tag color="red">Chưa nộp</Tag>;
        }
      },
      {
        title: 'Nhận xét của giảng viên',
        key: 'feedback',
        render: (record: any) => {
          const sub = session.submissions.find((s: any) => s.homeworkId === record.id);
          if (sub && sub.teacherFeedback) {
            return <Text className="italic text-slate-700">{sub.teacherFeedback}</Text>;
          }
          return <Text type="secondary">Chưa có nhận xét</Text>;
        }
      },
      {
        title: 'Hành động',
        key: 'action',
        align: 'right' as const,
        render: () => (
          <Button 
            type="primary"
            size="small"
            onClick={() => {
              navigate(`/student/course/${session.courseId}/learning/${session.id}_hw`);
            }}
          >
            Đến bài học
          </Button>
        )
      }
    ];

    return (
      <div className="space-y-4">
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => setSelectedSession(null)}
          className="bg-primary text-white border-none hover:bg-primary/90 rounded-full font-semibold"
        >
          Quay lại
        </Button>
        <Card className="border-0 shadow-soft overflow-hidden">
          <Table 
            columns={columns} 
            dataSource={data} 
            rowKey="id" 
            pagination={false}
          />
        </Card>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-10 max-w-[1400px] mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <Breadcrumb
            items={[
              { title: <a onClick={() => navigate('/student')}>Trang chủ</a> },
              { title: 'Bài tập' }
            ]}
          />
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <Title level={2} className="!m-0 text-primary">
              Bài tập
            </Title>
            {!selectedSession && (
              <Select
                value={selectedClassId}
                onChange={setSelectedClassId}
                className="w-full md:w-80"
                size="large"
                options={classes.map(c => ({
                  value: c.classId,
                  label: `[${c.course.title}] ${c.class?.title || 'Lớp học'}`
                }))}
                placeholder="Chọn môn học"
              />
            )}
          </div>

          {classes.length === 0 ? (
            <div className="text-center py-20">
              <Text type="secondary">Bạn chưa tham gia lớp học nào.</Text>
            </div>
          ) : (
            <>
              {!selectedSession && selectedClassId && renderSessionTable(selectedClassId)}
              {selectedSession && renderHomeworkTable(selectedSession)}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentAssignments;
