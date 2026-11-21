import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('========== START DELETE ==========');

    let result;

    result = await prisma.classResult.deleteMany();
    console.log(`ClassResult deleted: ${result.count}`);

    result = await prisma.examScore.deleteMany();
    console.log(`ExamScore deleted: ${result.count}`);

    result = await prisma.attendance.deleteMany();
    console.log(`Attendance deleted: ${result.count}`);

    result = await prisma.assignmentSubmission.deleteMany();
    console.log(`AssignmentSubmission deleted: ${result.count}`);

    result = await prisma.quizAttempt.deleteMany();
    console.log(`QuizAttempt deleted: ${result.count}`);

    result = await prisma.progress.deleteMany();
    console.log(`Progress deleted: ${result.count}`);

    result = await prisma.enrollment.deleteMany();
    console.log(`Enrollment deleted: ${result.count}`);

    result = await prisma.classSchedule.deleteMany();
    console.log(`ClassSchedule deleted: ${result.count}`);

    result = await prisma.notification.deleteMany();
    console.log(`Notification deleted: ${result.count}`);

    result = await prisma.class.deleteMany();
    console.log(`Class deleted: ${result.count}`);

    console.log('========== DELETE COMPLETED ==========');
}

main()
    .catch((error) => {
        console.error('DELETE ERROR:', error);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });