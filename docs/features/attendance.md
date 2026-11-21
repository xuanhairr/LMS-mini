# Điểm danh (Attendance)

Module theo dõi sự hiện diện của học viên trong các buổi học (Shift/Class).

## 1. Mô tả tính năng
- **Lịch học (Shift)**: Quản lý các ca học của các lớp offline hoặc livestream.
- **Điểm danh (Attendance)**: Giảng viên hoặc hệ thống ghi nhận trạng thái tham gia (Có mặt, Vắng, Đi trễ) của học viên cho từng ca.

## 2. Các thực thể Database (Entities)
- `Class` / `Shift`: Lớp học hoặc Ca học cụ thể.
- `Attendance`: Lưu trạng thái hiện diện của từng User ID theo Shift ID.

## 3. Các API/GraphQL chính
### Queries
- `attendances(shiftId)`: Lấy danh sách điểm danh của ca học.
- `myAttendanceRecords(classId)`: Xem lịch sử điểm danh của bản thân.

### Mutations
- `markAttendance(shiftId, records)`: Giảng viên cập nhật danh sách điểm danh.
