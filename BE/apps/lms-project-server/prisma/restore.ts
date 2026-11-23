import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Bắt đầu khôi phục dữ liệu...');

  const backupPath = path.join(__dirname, 'backup.json');
  if (!fs.existsSync(backupPath)) {
    throw new Error('Không tìm thấy file backup.json!');
  }

  const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

  // Xóa toàn bộ dữ liệu hiện tại bằng cách drop collections
  console.log('Đang dọn dẹp dữ liệu cũ (Xóa DB)...');
  const collections = ['Enrollment', 'ClassSchedule', 'Attendance', 'AssignmentSubmission', 'Homework', 'QuizAttempt', 'Question', 'Quiz', 'Video', 'Attachment', 'Progress', 'Lesson', 'Class', 'Course', 'Category', 'User'];
  for (const col of collections) {
    try {
      await prisma.$runCommandRaw({ drop: col });
    } catch (e) {
      // Bỏ qua nếu collection chưa tồn tại
    }
  }

  console.log('Bắt đầu chèn dữ liệu nguyên bản...');

  // Chèn lại theo thứ tự để đảm bảo relations
  if (data.users && data.users.length) {
    const cleanedUsers = data.users.map((u: any) => {
      const { resetPasswordToken, resetPasswordExpires, ...rest } = u;
      return rest;
    });
    await prisma.user.createMany({ data: cleanedUsers });
    console.log(`- Đã khôi phục ${data.users.length} Users`);
  }

  if (data.categories && data.categories.length) {
    await prisma.category.createMany({ data: data.categories });
    console.log(`- Đã khôi phục ${data.categories.length} Categories`);
  }

  if (data.courses && data.courses.length) {
    await prisma.course.createMany({ data: data.courses });
    console.log(`- Đã khôi phục ${data.courses.length} Courses`);
  }

  if (data.lessons && data.lessons.length) {
    await prisma.lesson.createMany({ data: data.lessons });
    console.log(`- Đã khôi phục ${data.lessons.length} Lessons`);
  }

  if (data.videos && data.videos.length) {
    await prisma.video.createMany({ data: data.videos });
    console.log(`- Đã khôi phục ${data.videos.length} Videos`);
  }

  if (data.quizzes && data.quizzes.length) {
    await prisma.quiz.createMany({ data: data.quizzes });
    console.log(`- Đã khôi phục ${data.quizzes.length} Quizzes`);
  }

  if (data.questions && data.questions.length) {
    await prisma.question.createMany({ data: data.questions });
    console.log(`- Đã khôi phục ${data.questions.length} Questions`);
  }

  if (data.homeworks && data.homeworks.length) {
    await prisma.homework.createMany({ data: data.homeworks });
    console.log(`- Đã khôi phục ${data.homeworks.length} Homeworks`);
  }

  if (data.classes && data.classes.length) {
    await prisma.class.createMany({ data: data.classes });
    console.log(`- Đã khôi phục ${data.classes.length} Classes`);
  }

  if (data.enrollments && data.enrollments.length) {
    await prisma.enrollment.createMany({ data: data.enrollments });
    console.log(`- Đã khôi phục ${data.enrollments.length} Enrollments`);
  }

  console.log('✅ Khôi phục thành công! Hệ thống đã trở về nguyên trạng ban đầu.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
