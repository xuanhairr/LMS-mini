import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const lessons = await p.lesson.findMany({
    include: { quizzes: true, homeworks: true }
  });

  for (const lesson of lessons) {
    let newQuizId: string | undefined;
    let newHomeworkId: string | undefined;

    // Add quiz if missing
    if (!lesson.quizzes || lesson.quizzes.length === 0) {
      const q = await p.quiz.create({
        data: {
          lessonId: lesson.id,
          title: `Trắc nghiệm: ${lesson.title}`,
          questions: {
            create: [
              {
                content: `Khái niệm cốt lõi của ${lesson.title} là gì?`,
                options: ['Khái niệm A', 'Khái niệm B', 'Khái niệm C', 'Khái niệm D'],
                correctAnswer: 0
              },
              {
                content: `Đâu là ứng dụng thực tế của ${lesson.title}?`,
                options: ['Ứng dụng X', 'Ứng dụng Y', 'Ứng dụng Z', 'Cả 3 đáp án trên'],
                correctAnswer: 3
              }
            ]
          }
        },
      });
      newQuizId = q.id;
    }

    // Add homework if missing
    if (!lesson.homeworks || lesson.homeworks.length === 0) {
      const h = await p.homework.create({
        data: {
          lessonId: lesson.id,
          title: `Bài tập thực hành: ${lesson.title}`,
          description: `<p>Hãy áp dụng các kiến thức đã học trong bài <strong>${lesson.title}</strong> để thực hiện yêu cầu sau:</p>
<p>1. Viết code hoặc thực hành theo nội dung bài học.</p>
<p>2. Nén source code hoặc tài liệu vào file .zip và nộp lên hệ thống.</p>`,
          level: 'Cơ bản',
        },
      });
      newHomeworkId = h.id;
    }

    if (newQuizId || newHomeworkId) {
      console.log(`Updated lesson: ${lesson.title} (Quiz: ${!!newQuizId}, HW: ${!!newHomeworkId})`);
    }
  }
}

main().catch(console.error).finally(() => p.$disconnect());
