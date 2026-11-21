import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Enrolling all students to classes...');

  // Get all students
  const students = await prisma.user.findMany({
    where: { roles: { has: 'STUDENT' } }
  });

  if (students.length === 0) {
    console.log('No students found.');
    return;
  }

  // Get all classes
  const classes = await prisma.class.findMany({
    include: { enrollments: true }
  });

  let enrollCount = 0;

  for (const cls of classes) {
    for (const student of students) {
      // Check if already enrolled
      const isEnrolled = cls.enrollments.some(e => e.studentId === student.id);
      
      if (!isEnrolled) {
        await prisma.enrollment.create({
          data: {
            studentId: student.id,
            classId: cls.id,
            courseId: cls.courseId,
            status: cls.status === 'finished' ? 'completed' : 'active'
          }
        });
        enrollCount++;
      }
    }
  }

  console.log(`Successfully added ${enrollCount} new enrollments. All ${students.length} students are now in all classes!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
