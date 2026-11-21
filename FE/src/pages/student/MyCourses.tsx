import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Input, Tag, Button, Empty, Badge } from 'antd';
import {
  SearchOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiFetch } from '@/lib/api';
import { Course } from '@/pages/teacher/ManageCourses';

// Enrollment interface based on backend
interface Enrollment {
  id: string;
  class: {
    id: string;
    courseId: string;
    course?: {
      id: string;
    };
  };
  student: {
    id: string;
  };
}

const MyCoursesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch active courses
        const res = await apiFetch<Course[]>('/courses?where[status][equals]=active');
        setCourses(res.data || []);

        // Fetch user enrollments if logged in
        if (user?.id) {
          // Use include to get the courseId of the class for easy matching
          const res = await apiFetch<Enrollment[]>(`/enrollments?where[student][id][equals]=${user.id}&include[class][include][course]=true`);
          setEnrollments(res.data || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // Filter courses based on search query
  const filteredCourses = courses.filter(course => {
    return course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.description || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Group courses by category
  const groupedCourses = filteredCourses.reduce((acc, course) => {
    const catName = course.category?.name || 'Khác';
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(course);
    return acc;
  }, {} as Record<string, Course[]>);

  const CourseCard = ({ course }: { course: Course }) => {
    // Chỉ ghi nhận là đã đăng ký (hiển thị Tiếp tục học) nếu lớp đã Sẵn sàng, Đang diễn ra hoặc Đã kết thúc
    const courseEnrollment = enrollments.find(e => 
        (e.class?.courseId === course.id || e.class?.course?.id === course.id) &&
        ['ready', 'active', 'finished'].includes(e.class?.status || '')
    );
    const isEnrolled = !!courseEnrollment;

    return (
      <Card
        className="card-hover border-0 shadow-soft h-full overflow-hidden transition-all duration-300"
        cover={
          <div className="relative overflow-hidden bg-gray-100 h-40 group">
            <img
              src={course.coverImage || '/placeholder-course.jpg'}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Button
                type="primary"
                size="large"
                icon={isEnrolled ? <PlayCircleOutlined /> : <CheckCircleOutlined />}
                onClick={() => navigate(`/student/course/${course.id}`)}
              >
                {isEnrolled ? 'Tiếp tục học' : 'Xem chi tiết'}
              </Button>
            </div>
            {course.status === 'draft' && (
              <div className="absolute top-2 left-2">
                <Tag color="orange">Sắp ra mắt</Tag>
              </div>
            )}
            {isEnrolled && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50">
                <div className="p-2">
                  <div className="flex items-center justify-between text-white text-xs mb-1">
                    <span>Đã đăng ký</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <Tag color="blue" className="mb-2">{course.category?.name || 'Khác'}</Tag>
            <h3 className="font-semibold text-base line-clamp-2 text-foreground">
              {course.title}
            </h3>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">
            {course.description}
          </p>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileTextOutlined /> Bài học
              </span>
              <span>{course.lessonCount || 0} bài học</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1">
                <ClockCircleOutlined /> Thời gian
              </span>
              <span>{course.duration ? Math.floor(course.duration / 60) : 0} phút</span>
            </div>
          </div>

          <Button
            type={isEnrolled ? "default" : "primary"}
            block
            icon={isEnrolled ? <PlayCircleOutlined /> : <CheckCircleOutlined />}
            onClick={() => navigate(`/student/course/${course.id}`)}
          >
            {isEnrolled ? 'Tiếp tục học' : 'Xem chi tiết'}
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Title */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Khóa học của tôi</h1>
          <p className="text-muted-foreground mt-1">
            Khám phá và tham gia các khóa học
          </p>
        </div>

        {/* Filters */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={16} lg={18}>
            <Input
              placeholder="Tìm kiếm khóa học..."
              prefix={<SearchOutlined />}
              size="large"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </Col>
          <Col xs={24} sm={8} lg={6}>
            <div className="flex items-center justify-end h-full gap-2">
              <span className="text-sm text-muted-foreground">Tìm thấy:</span>
              <Badge count={filteredCourses.length} color="blue" />
              <span className="text-sm font-medium">{filteredCourses.length} khóa học</span>
            </div>
          </Col>
        </Row>

        {/* Course Grouping */}
        {filteredCourses.length > 0 ? (
          Object.keys(groupedCourses).map(categoryName => (
            <div key={categoryName} className="mb-10">
              <h2 className="text-2xl font-bold mb-4">{categoryName}</h2>
              <Row gutter={[16, 16]}>
                {groupedCourses[categoryName].map(course => (
                  <Col key={course.id} xs={24} sm={12} lg={8}>
                    <CourseCard course={course} />
                  </Col>
                ))}
              </Row>
            </div>
          ))
        ) : (
          <Card className="border-0 shadow-soft">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Không tìm thấy khóa học nào"
              style={{ paddingTop: 40, paddingBottom: 40 }}
            >
              <Button
                type="primary"
                onClick={() => setSearchQuery('')}
              >
                Xóa tìm kiếm
              </Button>
            </Empty>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyCoursesPage;
