import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding alert classes for staff...');

  // 1. Get references
  const staff = await prisma.user.findUnique({ where: { username: 'staff_demo' } });
  const teacher = await prisma.user.findUnique({ where: { username: 'teacher_demo' } });
  
  if (!staff) {
    console.log('staff_demo not found');
    return;
  }

  // Get a course to attach to classes
  let course = await prisma.course.findFirst();
  if (!course) {
    console.log('No courses found, skipping...');
    return;
  }

  const now = new Date();
  
  // Create Date objects for tomorrow and yesterday
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);
  
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  // 1. Gathering -> Ready Alert (Gathering class starting tomorrow)
  await prisma.class.create({
    data: {
      title: 'PYTHON-01 - Python Cơ bản K1 (Gấp)',
      courseId: course.id,
      teacherId: teacher?.id, // Đã có GV
      managerId: staff.id,
      status: 'gathering',
      startDate: tomorrow,
      endDate: new Date(tomorrow.getTime() + 60 * 24 * 3600 * 1000), // 2 months
      sessionCount: 10
    }
  });

  // 2. Ready -> Active Alert (Ready class started yesterday)
  await prisma.class.create({
    data: {
      title: 'REACT-02 - Web Fullstack K2 (Trễ)',
      courseId: course.id,
      teacherId: teacher?.id, // Đã có GV
      managerId: staff.id,
      status: 'ready',
      startDate: yesterday,
      endDate: new Date(yesterday.getTime() + 60 * 24 * 3600 * 1000),
      sessionCount: 15
    }
  });

  // 3. Ready but missing teacher
  await prisma.class.create({
    data: {
      title: 'NODE-01 - Backend NodeJS (Thiếu GV)',
      courseId: course.id,
      // teacherId is null
      managerId: staff.id,
      status: 'ready',
      startDate: new Date(now.getTime() + 10 * 24 * 3600 * 1000), // 10 days in future
      endDate: new Date(now.getTime() + 70 * 24 * 3600 * 1000),
      sessionCount: 12
    }
  });

  console.log('Successfully seeded 3 alert classes for staff_demo!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
