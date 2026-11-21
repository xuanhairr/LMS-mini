import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const link = 'https://github.com/DuyTrung8403/rikkei-csdl-ss5';

  const classes = await p.class.findMany({
    include: {
      enrollments: {
        include: {
          student: true
        }
      },
      course: {
        include: {
          lessons: {
            include: {
              homeworks: true
            }
          }
        }
      }
    }
  });

  let count = 0;

  for (const cls of classes) {
    if (!cls.course) continue;
    
    const homeworks = cls.course.lessons.flatMap(l => l.homeworks);
    if (homeworks.length === 0) continue;

    for (const enrollment of cls.enrollments) {
      const student = enrollment.student;
      if (!student) continue;

      for (const hw of homeworks) {
        // Check if already submitted
        const existing = await p.assignmentSubmission.findFirst({
          where: {
            studentId: student.id,
            homeworkId: hw.id,
            classId: cls.id
          }
        });

        if (!existing) {
          await p.assignmentSubmission.create({
            data: {
              studentId: student.id,
              homeworkId: hw.id,
              classId: cls.id,
              githubLink: link,
              note: 'Đã nộp bài tự động',
              status: 'SUBMITTED',
              submittedAt: new Date()
            }
          });
          count++;
        } else if (!existing.githubLink) {
            await p.assignmentSubmission.update({
                where: { id: existing.id },
                data: {
                    githubLink: link,
                    note: 'Đã nộp bài tự động (cập nhật link)',
                    status: 'SUBMITTED',
                    submittedAt: new Date()
                }
            });
            count++;
        }
      }
    }
  }

  console.log(`Auto-submitted ${count} homeworks with link: ${link}`);
}

main().catch(console.error).finally(() => p.$disconnect());
