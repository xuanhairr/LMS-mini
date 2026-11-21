import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const quizzes = await p.quiz.findMany({
    include: { questions: true }
  });

  for (const quiz of quizzes) {
    const currentCount = quiz.questions.length;
    
    if (currentCount < 6) {
      const needed = 6 - currentCount;
      const newQuestions = [];
      
      for (let i = 0; i < needed; i++) {
        newQuestions.push({
          quizId: quiz.id,
          content: `Câu hỏi bổ sung số ${i + 1} cho bài: ${quiz.title}?`,
          options: [
            'Lựa chọn A (Sai)', 
            'Lựa chọn B (Đúng)', 
            'Lựa chọn C (Sai)', 
            'Lựa chọn D (Sai)'
          ],
          correctAnswer: 1,
          order: currentCount + i + 1
        });
      }
      
      await p.question.createMany({
        data: newQuestions
      });
      console.log(`Added ${needed} questions to quiz: ${quiz.title}`);
    }
  }

  // Sync the quiz attempts
  const attempts = await p.quizAttempt.findMany({
    include: { quiz: { include: { questions: true } } }
  });

  for (const attempt of attempts) {
    if (!attempt.quiz || !attempt.quiz.questions) continue;

    const totalQuestions = attempt.quiz.questions.length;
    const newTotalCorrect = totalQuestions;
    const newScore = 10.0;

    if (attempt.totalCorrect !== newTotalCorrect || attempt.score !== newScore) {
      await p.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          totalCorrect: newTotalCorrect,
          score: newScore,
          passed: true
        }
      });
      console.log(`Synced QuizAttempt ${attempt.id}: totalCorrect=${newTotalCorrect}, score=${newScore} (Quiz: ${attempt.quiz.title})`);
    }
  }
}

main().catch(console.error).finally(() => p.$disconnect());
