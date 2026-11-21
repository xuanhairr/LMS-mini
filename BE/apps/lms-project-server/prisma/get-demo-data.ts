import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const demoClass = await prisma.class.findFirst({
    where: { 
      teacher: { username: { startsWith: 'teacher_' } },
      manager: { username: { startsWith: 'staff_' } }
    },
    include: {
      course: true,
      teacher: true,
      manager: true,
      enrollments: { include: { student: true } }
    }
  });

  if (demoClass) {
    console.log('--- DEMO ACCOUNTS ---');
    console.log(`Giáo vụ: ${demoClass.manager?.username} / 123456`);
    console.log(`Giảng viên: ${demoClass.teacher?.username} / 123456`);
    const student = demoClass.enrollments[0]?.student;
    if (student) console.log(`Học viên: ${student.username} / 123456`);
    
    console.log('\n--- DEMO CASES ---');
    console.log(`Lớp học (Class ID): ${demoClass.id}`);
    console.log(`Tên lớp: ${demoClass.title} (Khóa: ${demoClass.course?.title})`);
    console.log(`- Trạng thái: ${demoClass.status}`);
  } else {
    console.log('Không tìm thấy lớp học hợp lệ');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
