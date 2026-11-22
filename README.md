# LMS-mini (Learning Management System)

Đây là dự án hệ thống quản lý học tập thu nhỏ, bao gồm hai thành phần chính:
- **Frontend (FE)**: Xây dựng với React, Vite, TailwindCSS.
- **Backend (BE)**: Xây dựng với NestJS, GraphQL, Prisma, Socket.io.

## Hướng dẫn chạy dự án (1 Click duy nhất)

Dự án đã được thiết lập các script giúp khởi chạy trọn gói: **MongoDB (Docker) + Backend (NestJS) + Frontend (React)** chỉ với một cú nhấp chuột.

### Dành cho Windows:
- **Khởi động**: Bạn chỉ cần **nhấp đúp chuột vào file `run.bat`** ở thư mục gốc (hoặc chạy `.\run.ps1` trong PowerShell).
- **Dừng hệ thống**: Nhấp đúp vào `stop.bat` để tắt Docker container và đóng 2 cửa sổ terminal của Frontend / Backend.

### Dành cho Server / Linux (Triển khai Production):
- Hệ thống hỗ trợ Docker Compose toàn diện (DB + BE + FE):
  ```bash
  docker compose up -d --build
  ```
- Tự động cập nhật code mới từ GitHub: `./deploy.sh`
- Tự động sao lưu dữ liệu MongoDB: `./backup.sh`
- Xem hướng dẫn chi tiết từng bước: [Hướng dẫn Triển khai lên Server (Deployment Guide)](docs/DEPLOYMENT_GUIDE.md)

Sau khi khởi chạy:
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3000
- **GraphQL**: http://localhost:3000/graphql
- **Database**: MongoDB cổng 27017

## Tài liệu Dự Án (Agent Driven Development)

Toàn bộ tài liệu phân tích thiết kế, kiến trúc và tính năng của hệ thống được viết lại theo chuẩn **Agent Driven Development (ADD)**. Điều này giúp các lập trình viên và các AI Agent dễ dàng nắm bắt ngữ cảnh, cấu trúc và cách phát triển tiếp dự án.

Vui lòng tham khảo các tài liệu chi tiết trong thư mục `docs/`:

1. [Kiến trúc hệ thống (Architecture)](docs/architecture.md)
2. [Quy trình phát triển (Agent Workflow)](docs/agent_workflow.md)
3. [Nhật ký thay đổi (Changelog)](docs/changelog.md)

### Danh sách các Module/Tính năng (Features):
(Vui lòng xem chi tiết trong thư mục `docs/features/`)
- [Quản lý Người dùng & Xác thực (Auth & User)](docs/features/auth_user.md)
- [Quản lý Khóa học & Bài giảng (Course & Lesson)](docs/features/course.md)
- [Quản lý Bài thi & Trắc nghiệm (Quiz)](docs/features/quiz.md)
- [Điểm danh (Attendance)](docs/features/attendance.md)
- [Thông báo hệ thống (Notifications)](docs/features/notifications.md)

---
*Lưu ý: Mọi thay đổi về code mới, thêm tính năng cần được cập nhật vào thư mục `docs/` để đảm bảo tài liệu luôn đồng bộ với code (chuẩn ADD).*
