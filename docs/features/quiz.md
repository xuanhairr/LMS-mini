# Bài thi & Trắc nghiệm (Quiz)

Module quản lý hệ thống tạo bài thi trắc nghiệm và ghi nhận kết quả làm bài của học viên.

## 1. Mô tả tính năng
- **Ngân hàng câu hỏi (Question Bank)**: Quản lý các câu hỏi (trắc nghiệm nhiều lựa chọn, đúng sai).
- **Bài thi (Quiz)**: Tạo bài kiểm tra gắn với bài học hoặc khóa học. Cấu hình thời gian làm bài, điểm đạt.
- **Làm bài & Chấm điểm (Quiz Attempt/Grading)**: Học viên thực hiện bài thi, hệ thống tự động chấm điểm và lưu kết quả.

## 2. Các thực thể Database (Entities)
- `Quiz`: Thông tin cấu hình bài thi.
- `Question`: Câu hỏi và các lựa chọn đáp án.
- `QuizAttempt`: Lượt làm bài của học viên, lưu thời gian bắt đầu/kết thúc.
- `Grading`: Lưu kết quả chấm điểm.

## 3. Các API/GraphQL chính
### Queries
- `quizzes(courseId)`: Lấy danh sách bài thi trong khóa.
- `quiz(id)`: Lấy chi tiết bài thi (bao gồm câu hỏi, nếu có quyền hoặc đang làm bài).
- `myQuizAttempts(quizId)`: Lấy lịch sử làm bài của user.

### Mutations
- `submitQuiz(attemptId, answers)`: Nộp bài thi, hệ thống tính toán và trả về điểm số.
- `startQuiz(quizId)`: Bắt đầu tính giờ làm bài.
