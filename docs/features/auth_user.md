# Quản lý Người dùng & Xác thực (Auth & User)

Module này chịu trách nhiệm quản lý thông tin người dùng trong hệ thống (Học viên, Giảng viên, Quản trị viên) và quá trình xác thực/phân quyền.

## 1. Mô tả tính năng
- **Đăng ký / Đăng nhập**: Xác thực qua email/password, sử dụng JWT.
- **Phân quyền (RBAC)**: Có các Role cơ bản: `ADMIN`, `TEACHER`, `STUDENT`.
- **Quản lý Hồ sơ (Profile)**: Người dùng có thể cập nhật thông tin cá nhân, ảnh đại diện (Cloudinary).
- **Quản lý User (dành cho Admin)**: Tạo, sửa, xóa, khóa tài khoản người dùng.

## 2. Các thực thể Database (Entities)
- `User`: Chứa thông tin tài khoản (id, email, password, roles, họ tên...).

## 3. Các API/GraphQL chính
### Queries
- `me`: Lấy thông tin user hiện tại (cần Token).
- `users`: (Admin) Lấy danh sách users có phân trang và lọc.
- `user(id)`: Lấy thông tin chi tiết một user.

### Mutations
- `login(email, password)`: Trả về Access Token.
- `register(input)`: Đăng ký tài khoản (tùy thuộc luồng dự án có cho phép public đăng ký không).
- `updateProfile(input)`: Cập nhật thông tin cá nhân.
- `updateUserRole(userId, roles)`: (Admin) Thay đổi quyền user.

*(Các chi tiết cụ thể về trường dữ liệu vui lòng xem thêm trong Prisma schema file tại BE/apps/lms-project-server/prisma/schema.prisma)*
