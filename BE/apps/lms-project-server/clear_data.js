const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Bắt đầu xóa dữ liệu...");

  await prisma.assignmentSubmission.deleteMany({});
  console.log("Đã xóa AssignmentSubmission");

  await prisma.homework.deleteMany({});
  console.log("Đã xóa Homework");

  await prisma.sessionAssignmentLesson.deleteMany({});
  console.log("Đã xóa SessionAssignmentLesson");

  await prisma.sessionAssignment.deleteMany({});
  console.log("Đã xóa SessionAssignment");

  await prisma.attachment.deleteMany({});
  console.log("Đã xóa Attachment");

  await prisma.classSchedule.deleteMany({});
  console.log("Đã xóa ClassSchedule");

  await prisma.enrollment.deleteMany({});
  console.log("Đã xóa Enrollment");

  await prisma.class.deleteMany({});
  console.log("Đã xóa Class");

  await prisma.quizAttempt.deleteMany({});
  console.log("Đã xóa QuizAttempt");

  await prisma.progress.deleteMany({});
  console.log("Đã xóa Progress");

  await prisma.question.deleteMany({});
  console.log("Đã xóa Question");

  await prisma.quiz.deleteMany({});
  console.log("Đã xóa Quiz");

  await prisma.video.deleteMany({});
  console.log("Đã xóa Video");

  await prisma.lesson.deleteMany({});
  console.log("Đã xóa Lesson");

  await prisma.course.deleteMany({});
  console.log("Đã xóa Course");

  await prisma.user.updateMany({
    data: {
      creatorId: null,
      updaterId: null
    }
  });

  const result = await prisma.user.deleteMany({
    where: {
      NOT: {
        roles: {
          has: "ADMIN"
        }
      }
    }
  });
  console.log(`Đã xóa ${result.count} User (chỉ giữ lại ADMIN)`);

  console.log("Hoàn tất dọn dẹp Database!");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
