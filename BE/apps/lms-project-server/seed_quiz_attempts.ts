import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const progresses = await p.progress.findMany({
    where: { completed: true },
    include: { lesson: { include: { quizzes: true } } }
  });

  for (const progress of progresses) {
    if (!progress.lesson || !progress.lesson.quizzes || progress.lesson.quizzes.length === 0) {
      continue;
    }

    for (const quiz of progress.lesson.quizzes) {
      const existingAttempt = await p.quizAttempt.findFirst({
        where: {
          studentId: progress.studentId!,
          quizId: quiz.id
        }
      });

      if (!existingAttempt) {
        await p.quizAttempt.create({
          data: {
            studentId: progress.studentId!,
            quizId: quiz.id,
            score: 9.0,
            totalCorrect: 9,
            passed: true,
            createdAt: progress.completedAt || new Date()
          }
        });
        console.log(`Created QuizAttempt for student ${progress.studentId} on quiz ${quiz.id} (Lesson: ${progress.lesson.title})`);
      }
    }
  }
}

main().catch(console.error).finally(() => p.$disconnect());
