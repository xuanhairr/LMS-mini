import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Input, Tag, Button, Empty, Badge, Segmented, Select, Tooltip } from 'antd';
import {
  SearchOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  BarsOutlined,
  UserOutlined,
  BookOutlined,
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
    status?: string;
  };
  student: {
    id: string;
  };
}

const MyCoursesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'default' | 'lessons' | 'name'>('default');
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

  // Extract unique categories with course count
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    courses.forEach(c => {
      const cat = c.category?.name || 'Khác';
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [courses]);

  // Filter and sort courses
  const displayedCourses = useMemo(() => {
    let result = courses.filter(course => {
      const matchSearch =
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (course.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory =
        selectedCategory === 'all' || (course.category?.name || 'Khác') === selectedCategory;
      return matchSearch && matchCategory;
    });

    if (sortBy === 'lessons') {
      result.sort((a, b) => (b.lessonCount || 0) - (a.lessonCount || 0));
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [courses, searchQuery, selectedCategory, sortBy]);

  const isCourseEnrolled = (courseId: string) => {
    return enrollments.some(e =>
      (e.class?.courseId === courseId || e.class?.course?.id === courseId) &&
      ['ready', 'active', 'finished'].includes(e.class?.status || '')
    );
  };

  // Card view: Dàn ngang trong Grid (3-4 card / hàng)
  const GridCourseCard = ({ course }: { course: Course }) => {
    const isEnrolled = isCourseEnrolled(course.id);

    return (
      <Card
        hoverable
        className="h-full flex flex-col overflow-hidden border border-slate-200/80 hover:border-primary/40 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl group"
        bodyStyle={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}
        cover={
          <div className="relative overflow-hidden bg-slate-100 h-44 group cursor-pointer" onClick={() => navigate(`/student/course/${course.id}`)}>
            <img
              src={course.coverImage || '/placeholder-course.jpg'}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                // Fallback placeholder image
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            
            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
              <Tag color="blue" className="rounded-md px-2 py-0.5 m-0 font-medium border-0 shadow-sm backdrop-blur-sm bg-blue-600/90 text-white">
                {course.category?.name || 'Khác'}
              </Tag>
              {course.status === 'draft' && (
                <Tag color="orange" className="rounded-md px-2 py-0.5 m-0 font-medium border-0 shadow-sm">
                  Sắp ra mắt
                </Tag>
              )}
            </div>

            {isEnrolled && (
              <div className="absolute top-3 right-3">
                <Tag color="green" className="rounded-md px-2 py-0.5 m-0 font-semibold border-0 shadow-sm bg-emerald-600 text-white flex items-center gap-1">
                  <CheckCircleOutlined /> Đã đăng ký
                </Tag>
              </div>
            )}

            <div className="absolute bottom-3 left-3 right-3 text-white">
              <div className="flex items-center justify-between text-xs font-medium text-slate-200">
                <span className="flex items-center gap-1">
                  <FileTextOutlined /> {course.lessonCount || 0} bài học
                </span>
                <span className="flex items-center gap-1">
                  <ClockCircleOutlined /> {course.duration ? Math.floor(course.duration / 60) : 0} phút
                </span>
              </div>
            </div>
          </div>
        }
      >
        <div className="flex flex-col flex-1 justify-between gap-3">
          <div>
            <h3
              onClick={() => navigate(`/student/course/${course.id}`)}
              className="font-bold text-base line-clamp-2 text-slate-800 hover:text-primary transition-colors cursor-pointer mb-1.5"
              title={course.title}
            >
              {course.title}
            </h3>

            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
              {course.description || 'Chưa có mô tả chi tiết cho khóa học này.'}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            {course.teacher?.fullName ? (
              <span className="text-xs text-slate-500 flex items-center gap-1 truncate max-w-[150px]">
                <UserOutlined className="text-slate-400" /> {course.teacher.fullName}
              </span>
            ) : (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <BookOutlined /> Học trực tuyến
              </span>
            )}

            <Button
              type={isEnrolled ? 'primary' : 'default'}
              size="middle"
              className={isEnrolled ? 'bg-primary hover:bg-primary/90 font-medium rounded-lg' : 'rounded-lg'}
              icon={isEnrolled ? <PlayCircleOutlined /> : <CheckCircleOutlined />}
              onClick={() => navigate(`/student/course/${course.id}`)}
            >
              {isEnrolled ? 'Tiếp tục học' : 'Xem chi tiết'}
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  // Horizontal Card: Banner hàng ngang kéo dài toàn màn hình
  const HorizontalCourseCard = ({ course }: { course: Course }) => {
    const isEnrolled = isCourseEnrolled(course.id);

    return (
      <Card
        hoverable
        className="w-full overflow-hidden border border-slate-200/80 hover:border-primary/40 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl group"
        bodyStyle={{ padding: '16px' }}
      >
        <div className="flex flex-col sm:flex-row gap-5 items-stretch">
          {/* Cover image */}
          <div
            className="w-full sm:w-64 h-40 sm:h-auto min-h-[140px] rounded-xl overflow-hidden relative shrink-0 cursor-pointer bg-slate-100"
            onClick={() => navigate(`/student/course/${course.id}`)}
          >
            <img
              src={course.coverImage || '/placeholder-course.jpg'}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60';
              }}
            />
            {isEnrolled && (
              <div className="absolute top-2.5 right-2.5">
                <Tag color="green" className="rounded-md px-2 py-0.5 m-0 font-semibold border-0 shadow-sm bg-emerald-600 text-white flex items-center gap-1">
                  <CheckCircleOutlined /> Đã đăng ký
                </Tag>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 flex flex-col justify-between py-0.5 gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <Tag color="blue" className="rounded-md px-2 py-0.5 m-0 font-medium border-0 bg-blue-50 text-blue-700">
                  {course.category?.name || 'Khác'}
                </Tag>
                {course.status === 'draft' && (
                  <Tag color="orange" className="rounded-md px-2 py-0.5 m-0 font-medium">
                    Sắp ra mắt
                  </Tag>
                )}
              </div>

              <h3
                onClick={() => navigate(`/student/course/${course.id}`)}
                className="font-bold text-lg text-slate-800 hover:text-primary transition-colors cursor-pointer mb-2"
              >
                {course.title}
              </h3>

              <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                {course.description || 'Chưa có mô tả chi tiết cho khóa học này.'}
              </p>
            </div>

            {/* Bottom metadata & Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
                <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60">
                  <FileTextOutlined className="text-blue-500" /> {course.lessonCount || 0} bài học
                </span>
                <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60">
                  <ClockCircleOutlined className="text-emerald-500" /> {course.duration ? Math.floor(course.duration / 60) : 0} phút
                </span>
                {course.teacher?.fullName && (
                  <span className="hidden md:flex items-center gap-1.5 text-slate-500">
                    <UserOutlined className="text-slate-400" /> Giảng viên: <strong>{course.teacher.fullName}</strong>
                  </span>
                )}
              </div>

              <Button
                type={isEnrolled ? 'primary' : 'default'}
                size="large"
                className={isEnrolled ? 'bg-primary hover:bg-primary/90 font-medium px-6 rounded-xl' : 'px-6 rounded-xl'}
                icon={isEnrolled ? <PlayCircleOutlined /> : <CheckCircleOutlined />}
                onClick={() => navigate(`/student/course/${course.id}`)}
              >
                {isEnrolled ? 'Tiếp tục học' : 'Xem chi tiết'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-10">
        {/* Page Title & View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Khóa học của tôi</h1>
            <p className="text-slate-500 text-sm mt-1">
              Khám phá lộ trình học tập và tiếp tục các khóa học đã ghi danh
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">Kiểu hiển thị:</span>
            <Segmented
              value={viewMode}
              onChange={(val) => setViewMode(val as 'grid' | 'list')}
              options={[
                {
                  value: 'grid',
                  icon: <AppstoreOutlined />,
                  label: 'Lưới hàng ngang',
                },
                {
                  value: 'list',
                  icon: <BarsOutlined />,
                  label: 'Thanh ngang',
                },
              ]}
              className="bg-slate-100 p-1 rounded-xl shadow-inner"
            />
          </div>
        </div>

        {/* Filter bar: Search + Sắp xếp + Danh mục */}
        <div className="space-y-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={14} lg={16}>
              <Input
                placeholder="Tìm kiếm theo tên khóa học hoặc nội dung..."
                prefix={<SearchOutlined className="text-slate-400" />}
                size="large"
                allowClear
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl"
              />
            </Col>

            <Col xs={24} md={10} lg={8}>
              <div className="flex items-center justify-between sm:justify-end gap-3">
                <span className="text-xs text-slate-500 whitespace-nowrap">Sắp xếp:</span>
                <Select
                  value={sortBy}
                  onChange={(val) => setSortBy(val)}
                  size="large"
                  className="w-44"
                  options={[
                    { value: 'default', label: 'Mặc định' },
                    { value: 'lessons', label: 'Nhiều bài nhất' },
                    { value: 'name', label: 'Tên A - Z' },
                  ]}
                />
                <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-2 rounded-xl whitespace-nowrap">
                  {displayedCourses.length} khóa học
                </div>
              </div>
            </Col>
          </Row>

          {/* Category Tabs: Thanh phân loại hàng ngang */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              Tất cả ({courses.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  selectedCategory === cat.name
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        </div>

        {/* Course List Display */}
        {displayedCourses.length > 0 ? (
          viewMode === 'grid' ? (
            /* Lưới hàng ngang: Xếp đều các card 3-4 card trên 1 hàng, lấp đầy không gian */
            <Row gutter={[20, 20]}>
              {displayedCourses.map(course => (
                <Col key={course.id} xs={24} sm={12} lg={8} xl={8}>
                  <GridCourseCard course={course} />
                </Col>
              ))}
            </Row>
          ) : (
            /* Thanh ngang (List): Mỗi khóa học dàn trải trọn vẹn toàn bộ chiều rộng */
            <div className="space-y-4">
              {displayedCourses.map(course => (
                <HorizontalCourseCard key={course.id} course={course} />
              ))}
            </div>
          )
        ) : (
          <Card className="border border-slate-200/80 rounded-2xl shadow-sm text-center py-10">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div className="space-y-1">
                  <p className="text-base font-medium text-slate-700">Không tìm thấy khóa học nào phù hợp</p>
                  <p className="text-xs text-slate-400">Hãy thử đổi từ khóa tìm kiếm hoặc chọn danh mục khác</p>
                </div>
              }
            >
              <Button
                type="primary"
                className="mt-2 rounded-lg"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
              >
                Xóa bộ lọc tìm kiếm
              </Button>
            </Empty>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyCoursesPage;
