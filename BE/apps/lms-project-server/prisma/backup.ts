import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Bắt đầu backup dữ liệu...');

  const data = {
    users: await prisma.user.findMany(),
    courses: await prisma.course.findMany(),
    categories: await prisma.category.findMany(),
    lessons: await prisma.lesson.findMany(),
    videos: await prisma.video.findMany(),
    quizzes: await prisma.quiz.findMany(),
    questions: await prisma.question.findMany(),
    homeworks: await prisma.homework.findMany(),
    classes: await prisma.class.findMany(),
    enrollments: await prisma.enrollment.findMany(),
  };

  const backupPath = path.join(__dirname, 'backup.json');
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));

  console.log(`Đã sao lưu thành công tại: ${backupPath}`);
  console.log(`- Users: ${data.users.length}`);
  console.log(`- Courses: ${data.courses.length}`);
  console.log(`- Classes: ${data.classes.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
