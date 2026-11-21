import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'trungnd412@gmail.com';
  
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.log(`User ${email} not found.`);
    return;
  }

  const userId = user.id;

  console.log(`Found user ${email} with ID: ${userId}. Deleting related records...`);

  // Delete related records
  await prisma.enrollment.deleteMany({ where: { studentId: userId } });
  await prisma.progress.deleteMany({ where: { studentId: userId } });
  await prisma.quizAttempt.deleteMany({ where: { studentId: userId } });
  await prisma.assignmentSubmission.deleteMany({ where: { studentId: userId } });
  await prisma.attendance.deleteMany({ where: { studentId: userId } });
  await prisma.notification.deleteMany({ where: { userId: userId } });

  // Delete the user
  await prisma.user.delete({ where: { id: userId } });

  console.log(`Successfully deleted user ${email} and all related records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
