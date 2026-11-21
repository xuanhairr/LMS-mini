# LMS-mini (Learning Management System)

Đây là dự án hệ thống quản lý học tập thu nhỏ, bao gồm hai thành phần chính:
- **Frontend (FE)**: Xây dựng với React, Vite, TailwindCSS.
- **Backend (BE)**: Xây dựng với NestJS, GraphQL, Prisma, Socket.io.

## Hướng dẫn chạy dự án (1 lệnh duy nhất)

Dự án đã được thiết lập các script giúp khởi chạy đồng thời cả Frontend và Backend chỉ với một lệnh. Các script này sẽ tự động mở hai cửa sổ dòng lệnh riêng biệt cho mỗi service.

### Dành cho Windows:
Bạn có thể nhấp đúp vào tệp `run.bat` ở thư mục gốc, hoặc chạy lệnh sau trong Command Prompt / PowerShell:
```bash
.\run.bat
```
Hoặc nếu bạn muốn dùng PowerShell script:
```powershell
.\run.ps1
```

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
