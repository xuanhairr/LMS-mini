# Quản lý Khóa học & Bài giảng (Course & Lesson)

Module quản lý toàn bộ nội dung học tập, cấu trúc khóa học và tiến độ của học viên.

## 1. Mô tả tính năng
- **Khóa học (Course)**: Tạo, sửa, xóa khóa học. Cấu hình giá, mô tả, ảnh bìa, giảng viên phụ trách.
- **Danh mục (Category)**: Phân loại khóa học.
- **Bài giảng (Lesson)**: Nội dung chi tiết của khóa học (video, text, tài liệu đính kèm). Các bài giảng có thể được nhóm thành các Chương/Phần (Sections/Modules).
- **Ghi danh (Enrollment)**: Quản lý học viên đăng ký tham gia khóa học.
- **Tiến độ (Progress)**: Theo dõi học viên đã học đến bài nào, hoàn thành bao nhiêu %.

## 2. Các thực thể Database (Entities)
- `Course`: Thông tin khóa học.
- `Category`: Danh mục khóa học.
- `Lesson`: Nội dung bài học (video url, content).
- `Enrollment`: Bảng trung gian liên kết User (Student) và Course.
- `Progress`: Bảng lưu vết trạng thái hoàn thành của từng User cho từng Lesson.

## 3. Các API/GraphQL chính
### Queries
- `courses`: Lấy danh sách khóa học (public, hoặc kèm điều kiện lọc).
- `course(id)`: Lấy thông tin chi tiết khóa học.
- `myCourses`: Lấy danh sách khóa học mà User đang học.
- `lessons(courseId)`: Lấy danh sách bài giảng của khóa học.

### Mutations
- `createCourse(input)`: (Admin/Teacher) Tạo mới khóa học.
- `updateCourse(id, input)`: Cập nhật khóa học.
- `enrollCourse(courseId)`: Học viên đăng ký khóa học.
- `markLessonComplete(lessonId)`: Học viên đánh dấu đã học xong bài giảng, kích hoạt cập nhật Tiến độ.
