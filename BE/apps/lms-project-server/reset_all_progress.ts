import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetAllProgress() {
  try {
    console.log('Tiến hành xóa toàn bộ dữ liệu tiến độ học tập...');
    const progressResult = await prisma.progress.deleteMany({});
    console.log(`Đã xóa ${progressResult.count} bản ghi Progress.`);

    const quizResult = await prisma.quizAttempt.deleteMany({});
    console.log(`Đã xóa ${quizResult.count} bản ghi QuizAttempt.`);

    console.log('Hoàn tất reset dữ liệu học tập!');
  } catch (error) {
    console.error('Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAllProgress();
