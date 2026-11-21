import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const attempts = await p.quizAttempt.findMany({
    include: { quiz: { include: { questions: true } } }
  });

  for (const attempt of attempts) {
    if (!attempt.quiz || !attempt.quiz.questions) continue;

    const totalQuestions = attempt.quiz.questions.length;
    
    // Giả sử fake cho học viên full điểm (trả lời đúng hết)
    const newTotalCorrect = totalQuestions;
    const newScore = 10.0; // Thang điểm 10

    if (attempt.totalCorrect !== newTotalCorrect || attempt.score !== newScore) {
      await p.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          totalCorrect: newTotalCorrect,
          score: newScore,
          passed: true
        }
      });
      console.log(`Updated QuizAttempt ${attempt.id}: totalCorrect=${newTotalCorrect}, score=${newScore} (Quiz: ${attempt.quiz.title})`);
    }
  }
}

main().catch(console.error).finally(() => p.$disconnect());
