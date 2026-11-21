import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const submissions = await p.assignmentSubmission.findMany({
    include: {
      homework: {
        select: { lessonId: true }
      }
    }
  });

  let deletedCount = 0;

  for (const sub of submissions) {
    const lessonId = sub.homework.lessonId;
    if (!lessonId) continue;

    const quiz = await p.quiz.findFirst({
      where: { lessonId }
    });

    if (quiz) {
      const attempt = await p.quizAttempt.findFirst({
        where: {
          studentId: sub.studentId,
          quizId: quiz.id,
          passed: true
        }
      });

      // If there is a quiz but the student hasn't passed it, they shouldn't have submitted homework
      if (!attempt) {
        await p.assignmentSubmission.delete({
          where: { id: sub.id }
        });
        deletedCount++;
      }
    } else {
        // If there's no quiz, should they be able to submit homework?
        // Let's also check if they finished the video? No, just checking quiz is enough for the user's request.
    }
  }

  console.log(`Deleted ${deletedCount} homework submissions because the student hasn't passed the corresponding quiz.`);
}

main().catch(console.error).finally(() => p.$disconnect());
