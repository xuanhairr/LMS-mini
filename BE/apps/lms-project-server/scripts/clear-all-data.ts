import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- BẮT ĐẦU DỌN DẸP TOÀN BỘ DATA ---");

  try {
    // 1. Xóa các bảng dữ liệu học tập và quan hệ
    console.log("Đang xóa Enrollment...");
    await prisma.enrollment.deleteMany({});
    
    console.log("Đang xóa QuizAttempt...");
    await prisma.quizAttempt.deleteMany({});
    
    console.log("Đang xóa Progress...");
    await prisma.progress.deleteMany({});
    
    console.log("Đang xóa Question...");
    await prisma.question.deleteMany({});
    
    console.log("Đang xóa Quiz...");
    await prisma.quiz.deleteMany({});
    
    console.log("Đang xóa Video...");
    await prisma.video.deleteMany({});
    
    console.log("Đang xóa Lesson...");
    await prisma.lesson.deleteMany({});
    
    console.log("Đang xóa Class...");
    await prisma.class.deleteMany({});
    
    console.log("Đang xóa Course...");
    await prisma.course.deleteMany({});

    // 2. Xóa tất cả người dùng ngoại trừ ADMIN
    console.log("Đang xóa Users (ngoại trừ Admin)...");
    const deleteUsers = await prisma.user.deleteMany({
      where: {
        NOT: {
          roles: {
            has: "ADMIN"
          }
        }
      }
    });

    console.log(`=> Đã xóa ${deleteUsers.count} người dùng.`);
    console.log("--- HOÀN TẤT: CHỈ CÒN LẠI USER ADMIN ---");
  } catch (error) {
    console.error("Lỗi khi dọn dẹp data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
