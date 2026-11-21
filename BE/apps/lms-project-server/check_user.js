const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const enrollments = await prisma.enrollment.findMany({
    select: {
      id: true,
      studentId: true,
      classId: true,
      courseId: true,
      status: true,
      student: { select: { username: true, fullName: true, email: true } }
    }
  });
  console.log(JSON.stringify(enrollments, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
