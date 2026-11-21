# Thông báo (Notifications)

Module gửi các thông báo từ hệ thống hoặc giảng viên đến học viên theo thời gian thực.

## 1. Mô tả tính năng
- **Gửi thông báo (In-app)**: Hiển thị thông báo trên giao diện web khi có sự kiện (ví dụ: Khóa học mới, bài thi có điểm, nhắc nhở điểm danh).
- **Email Notifications**: Gửi email thông qua các dịch vụ bên ngoài (Nodemailer).
- **Thời gian thực (Real-time)**: Sử dụng Socket.io để đẩy thông báo ngay lập tức.

## 2. Các thực thể Database (Entities)
- `Notification`: Nội dung thông báo, loại thông báo.
- `UserNotification`: Trạng thái đã đọc/chưa đọc của thông báo cho từng người dùng.

## 3. Các API/GraphQL chính
### Queries
- `myNotifications`: Lấy danh sách thông báo của user (phân trang).
- `unreadNotificationCount`: Lấy số lượng thông báo chưa đọc.

### Mutations
- `markNotificationAsRead(id)`: Đánh dấu thông báo đã đọc.
- `markAllNotificationsAsRead`: Đánh dấu tất cả đã đọc.
