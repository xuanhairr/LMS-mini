import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Quizzes, Homeworks and more Classes...');

  const lessons = await prisma.lesson.findMany({
    include: {
      quizzes: true,
      homeworks: true,
      course: true,
    }
  });

  let quizCount = 0;
  let hwCount = 0;

  for (const lesson of lessons) {
    // 1. If lesson has no quiz, create one
    if (lesson.quizzes.length === 0) {
      await prisma.quiz.create({
        data: {
          title: `Quiz trắc nghiệm: ${lesson.title}`,
          lessonId: lesson.id,
          questions: {
            create: [
              {
                content: 'Câu hỏi 1: Đâu là khẳng định đúng nhất về kiến thức trong bài này?',
                options: ['Đáp án A: Đúng nhưng chưa đủ', 'Đáp án B: Sai hoàn toàn', 'Đáp án C: Chính xác tuyệt đối', 'Đáp án D: Không có đáp án nào'],
                correctAnswer: 2,
                order: 1
              },
              {
                content: 'Câu hỏi 2: Khái niệm nào được nhắc đến nhiều nhất?',
                options: ['Lý thuyết suông', 'Thực hành code', 'Cách cài đặt môi trường', 'Cả 3 phương án trên'],
                correctAnswer: 3,
                order: 2
              }
            ]
          }
        }
      });
      quizCount++;
    }

    // 2. If lesson has no homework, create one
    if (lesson.homeworks.length === 0) {
      await prisma.homework.create({
        data: {
          title: `Bài tập về nhà: Thực hành ${lesson.title}`,
          description: '<p>Sinh viên hãy làm bài tập thực hành theo yêu cầu của bài giảng và nộp file zip code lên hệ thống.</p>',
          level: 'Khá',
          order: 1,
          lessonId: lesson.id
        }
      });
      hwCount++;
    }
  }

  console.log(`Added ${quizCount} quizzes and ${hwCount} homeworks.`);

  // 3. Create more classes
  const staff = await prisma.user.findUnique({ where: { username: 'staff_demo' } });
  const teacher = await prisma.user.findUnique({ where: { username: 'teacher_demo' } });
  const student1 = await prisma.user.findUnique({ where: { username: 'student1_demo' } });
  const student2 = await prisma.user.findUnique({ where: { username: 'student2_demo' } });

  const reactCourse = await prisma.course.findFirst({ where: { title: { contains: 'React' } } });
  const pgCourse = await prisma.course.findFirst({ where: { title: { contains: 'PostgreSQL' } } });

  if (staff && teacher && reactCourse && pgCourse) {
    const shift = await prisma.shift.findFirst();

    if (shift) {
      const cls1 = await prisma.class.create({
        data: {
          title: 'REACT-03 - Web Fullstack K3 (Cấp tốc)',
          courseId: reactCourse.id,
          teacherId: teacher.id,
          managerId: staff.id,
          status: 'active',
          startDate: new Date(),
          endDate: new Date(new Date().getTime() + 30 * 24 * 3600 * 1000),
          sessionCount: 5,
          schedule: {
            create: {
              shift: shift.code,
              startTime: shift.startTime,
              endTime: shift.endTime,
              dayOfWeek: [1, 2, 3, 4, 5]
            }
          }
        }
      });

      const cls2 = await prisma.class.create({
        data: {
          title: 'PG-02 - SQL Nâng cao K2',
          courseId: pgCourse.id,
          teacherId: teacher.id,
          managerId: staff.id,
          status: 'finished',
          startDate: new Date(new Date().getTime() - 60 * 24 * 3600 * 1000),
          endDate: new Date(new Date().getTime() - 10 * 24 * 3600 * 1000),
          sessionCount: 10,
          schedule: {
            create: {
              shift: shift.code,
              startTime: shift.startTime,
              endTime: shift.endTime,
              dayOfWeek: [6, 0]
            }
          }
        }
      });

      if (student1 && student2) {
        await prisma.enrollment.createMany({
          data: [
            { studentId: student1.id, classId: cls1.id, courseId: reactCourse.id, status: 'active' },
            { studentId: student2.id, classId: cls1.id, courseId: reactCourse.id, status: 'active' },
            { studentId: student1.id, classId: cls2.id, courseId: pgCourse.id, status: 'completed' },
            { studentId: student2.id, classId: cls2.id, courseId: pgCourse.id, status: 'completed' },
          ]
        });
      }

      console.log('Created 2 more classes (REACT-03 active, PG-02 finished) and enrolled students.');
    }
  }

}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
