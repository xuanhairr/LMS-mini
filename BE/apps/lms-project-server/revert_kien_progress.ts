import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const email = 'kiennd03@gmail.com';
  const student = await p.user.findUnique({ where: { email } });
  if (!student) throw new Error('Student not found');

  const course = await p.course.findFirst({
    where: { title: { contains: 'Flutter' } },
    include: {
      lessons: {
        orderBy: { order: 'desc' },
        take: 1,
        include: {
          quizzes: true,
          homeworks: true,
          videos: true
        }
      }
    }
  });

  if (!course || course.lessons.length === 0) throw new Error('Course or lesson not found');

  const lastLesson = course.lessons[0];
  console.log(`Reverting progress for lesson: ${lastLesson.title}`);

  // Delete QuizAttempts
  for (const quiz of lastLesson.quizzes) {
    await p.quizAttempt.deleteMany({
      where: {
        studentId: student.id,
        quizId: quiz.id
      }
    });
    console.log(`Deleted quiz attempts for quiz: ${quiz.title}`);
  }

  // Delete AssignmentSubmissions
  for (const hw of lastLesson.homeworks) {
    await p.assignmentSubmission.deleteMany({
      where: {
        studentId: student.id,
        homeworkId: hw.id
      }
    });
    console.log(`Deleted homework submissions for homework: ${hw.title}`);
  }

  // Update Progress
  const progress = await p.progress.findFirst({
    where: {
      studentId: student.id,
      lessonId: lastLesson.id
    }
  });

  if (progress) {
    // Keep video progress, but remove quiz and homework from completedItems
    const itemsToRemove = [
      ...lastLesson.quizzes.map(q => q.id),
      ...lastLesson.homeworks.map(h => h.id)
    ];
    const newCompletedItems = progress.completedItems.filter(id => !itemsToRemove.includes(id));
    
    await p.progress.update({
      where: { id: progress.id },
      data: {
        completed: false,
        completionStatus: 'IN_PROGRESS',
        completedItems: newCompletedItems
      }
    });
    console.log('Progress updated to IN_PROGRESS.');
  }

}

main().catch(console.error).finally(() => p.$disconnect());
