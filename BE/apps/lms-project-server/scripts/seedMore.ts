import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding more demo data...');

  const staff = await prisma.user.findUnique({ where: { username: 'staff_demo' } });
  const teacher = await prisma.user.findUnique({ where: { username: 'teacher_demo' } });
  const student1 = await prisma.user.findUnique({ where: { username: 'student1_demo' } });
  const student2 = await prisma.user.findUnique({ where: { username: 'student2_demo' } });

  if (!staff || !teacher || !student1 || !student2) {
    console.error('Không tìm thấy đủ các user demo. Vui lòng tạo lại các tài khoản demo trước.');
    return;
  }

  const catWeb = await prisma.category.upsert({
    where: { name: 'Lập trình Web' },
    update: {},
    create: { name: 'Lập trình Web', description: 'Các khóa học về frontend và backend' }
  });
  const catMobile = await prisma.category.upsert({
    where: { name: 'Lập trình Mobile' },
    update: {},
    create: { name: 'Lập trình Mobile', description: 'React Native, Flutter, Swift, Kotlin' }
  });

  const courseReact = await prisma.course.create({
    data: {
      title: 'Fullstack ReactJS & NodeJS',
      description: 'Học lập trình web từ A-Z với MERN stack.',
      coverImage: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      status: 'active',
      lessonCount: 5,
      categoryId: catWeb.id,
      creatorId: staff.id,
      updaterId: staff.id,
      lessons: {
        create: [
          { title: 'Bài 1: Tổng quan ReactJS', content: '<p>Làm quen với JSX, State, Props</p>', order: 1, sessionNumber: 1, status: 'published' },
          { title: 'Bài 2: React Hooks', content: '<p>Làm quen với useState, useEffect</p>', order: 2, sessionNumber: 2, status: 'published' },
          { title: 'Bài 3: NodeJS Cơ bản', content: '<p>Tạo RESTful API cơ bản</p>', order: 3, sessionNumber: 3, status: 'published' },
          { title: 'Bài 4: Kết nối Database', content: '<p>Sử dụng MongoDB và Prisma</p>', order: 4, sessionNumber: 4, status: 'published' },
          { title: 'Bài 5: Tổng kết Project', content: '<p>Làm project thực tế MERN Stack</p>', order: 5, sessionNumber: 5, status: 'published' }
        ]
      }
    },
    include: { lessons: true }
  });

  const courseFlutter = await prisma.course.create({
    data: {
      title: 'Xây dựng App với Flutter',
      description: 'Khóa học lập trình mobile đa nền tảng với Flutter của Google.',
      coverImage: 'https://images.unsplash.com/photo-1617042375876-a13e36732a04?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      status: 'active',
      lessonCount: 3,
      categoryId: catMobile.id,
      creatorId: staff.id,
      updaterId: staff.id,
      lessons: {
        create: [
          { title: 'Bài 1: Cài đặt môi trường', content: '<p>Cài đặt Flutter SDK, Android Studio</p>', order: 1, sessionNumber: 1, status: 'published' },
          { title: 'Bài 2: Widgets cơ bản', content: '<p>Stateless & Stateful Widgets</p>', order: 2, sessionNumber: 2, status: 'published' },
          { title: 'Bài 3: Build & Deploy', content: '<p>Xuất file APK, IPA đẩy lên store</p>', order: 3, sessionNumber: 3, status: 'published' }
        ]
      }
    },
    include: { lessons: true }
  });

  const reactLesson2 = courseReact.lessons.find(l => l.sessionNumber === 2);
  if (reactLesson2) {
    await prisma.homework.create({
      data: {
        title: 'Bài tập 2: Xây dựng Todo List bằng Hooks',
        description: '<p>Sử dụng useState để thêm, sửa, xóa các công việc.</p>',
        lessonId: reactLesson2.id,
        level: 'Khá',
        order: 1
      }
    });
  }

  const reactLesson5 = courseReact.lessons.find(l => l.sessionNumber === 5);
  if (reactLesson5) {
    await prisma.homework.create({
      data: {
        title: 'Đồ án Cuối khóa: E-commerce Website',
        description: '<p>Nộp link Github của đồ án thương mại điện tử.</p>',
        lessonId: reactLesson5.id,
        level: 'Giỏi',
        order: 1
      }
    });
  }

  const shiftMorning = await prisma.shift.upsert({
    where: { code: 'MORNING_1' },
    update: {},
    create: { code: 'MORNING_1', name: 'Ca Sáng (08h - 10h)', startTime: '08:00', endTime: '10:00', isActive: true }
  });
  
  const shiftEvening = await prisma.shift.upsert({
    where: { code: 'EVENING_1' },
    update: {},
    create: { code: 'EVENING_1', name: 'Ca Tối (19h - 21h)', startTime: '19:00', endTime: '21:00', isActive: true }
  });

  const classReact = await prisma.class.create({
    data: {
      title: 'REACT-01 - Web Fullstack K1',
      courseId: courseReact.id,
      teacherId: teacher.id,
      managerId: staff.id,
      status: 'active',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-08-01'),
      sessionCount: 5,
      schedule: {
        create: {
          shift: shiftEvening.code,
          startTime: shiftEvening.startTime,
          endTime: shiftEvening.endTime,
          dayOfWeek: [1, 3, 5]
        }
      }
    }
  });

  const classFlutter = await prisma.class.create({
    data: {
      title: 'FLUTTER-01 - Mobile Đa nền tảng K1',
      courseId: courseFlutter.id,
      teacherId: teacher.id,
      managerId: staff.id,
      status: 'ready',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-09-01'),
      sessionCount: 3,
      schedule: {
        create: {
          shift: shiftMorning.code,
          startTime: shiftMorning.startTime,
          endTime: shiftMorning.endTime,
          dayOfWeek: [6, 0]
        }
      }
    }
  });

  await prisma.enrollment.createMany({
    data: [
      { studentId: student1.id, classId: classReact.id, courseId: courseReact.id, status: 'active' },
      { studentId: student2.id, classId: classReact.id, courseId: courseReact.id, status: 'active' },
      { studentId: student1.id, classId: classFlutter.id, courseId: courseFlutter.id, status: 'active' }
    ]
  });

  console.log('Seeding demo data completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
