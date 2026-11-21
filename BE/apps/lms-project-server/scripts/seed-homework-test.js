/**
 * Script seed data để test hệ thống cảnh báo Bài Tập Về Nhà (BTVN)
 * 
 * Luồng tạo:
 * 1. Tìm teacher và student account hiện có
 * 2. Tìm hoặc tạo Course có lesson + homework
 * 3. Tạo Class có ClassSchedule (lịch học thực tế, startDate từ mấy tuần trước)
 * 4. Enroll student vào lớp
 * 5. Kết quả: student sẽ thấy cảnh báo BTVN chưa nộp trên dashboard
 * 
 * Cách chạy:
 *   node scripts/seed-homework-test.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Bắt đầu seed test data BTVN...\n');

  // =========================================================
  // 1. Tìm các account có sẵn trong DB
  // =========================================================
  const allUsers = await prisma.user.findMany({
    select: { id: true, username: true, roles: true, fullName: true },
    take: 50,
  });

  console.log('📋 Danh sách user hiện có:');
  allUsers.forEach(u => console.log(`  - [${u.roles.join(',')}] ${u.username} (${u.fullName || 'N/A'}) | id=${u.id}`));

  // Tìm teacher
  const teacher = allUsers.find(u => u.roles.includes('TEACHER'));
  if (!teacher) {
    console.error('❌ Không tìm thấy TEACHER trong DB! Hãy tạo account giảng viên trước.');
    process.exit(1);
  }
  console.log(`\n✅ Giảng viên: ${teacher.username} (${teacher.id})`);

  // Tìm student (lấy 2 học viên đầu tiên để test)
  const students = allUsers.filter(u => u.roles.includes('STUDENT')).slice(0, 2);
  if (students.length === 0) {
    console.error('❌ Không tìm thấy STUDENT trong DB! Hãy tạo account học viên trước.');
    process.exit(1);
  }
  console.log(`✅ Học viên test: ${students.map(s => s.username).join(', ')}`);

  // =========================================================
  // 2. Tìm hoặc tạo Course có bài học + homework
  // =========================================================
  // Tìm course của teacher này đã có lesson + homework
  let course = await prisma.course.findFirst({
    where: {
      teacherId: teacher.id,
      status: 'active',
    },
    include: {
      lessons: {
        include: { homeworks: true },
        orderBy: { order: 'asc' },
      },
    },
  });

  let lessonsWithHomework = course?.lessons.filter(l => l.homeworks.length > 0) || [];

  if (!course || lessonsWithHomework.length < 2) {
    console.log('\n⚠️  Không đủ lesson có homework. Đang tạo course test...');

    course = await prisma.course.create({
      data: {
        title: '[TEST] ReactJS - Lập trình Web Frontend',
        description: 'Khóa học ReactJS cơ bản đến nâng cao dành cho test cảnh báo BTVN',
        status: 'active',
        teacherId: teacher.id,
        creatorId: teacher.id,
        lessonCount: 5,
      },
    });

    console.log(`  ✅ Tạo course: ${course.title} (${course.id})`);

    // Tạo 5 buổi học, mỗi buổi có homework
    const lessonData = [
      {
        title: 'Buổi 1 - HTML & CSS cơ bản',
        order: 0,
        homeworks: [
          { title: '[Easy] Tạo trang profile cá nhân bằng HTML', level: 'Easy', order: 0 },
          { title: '[Easy] Thiết kế menu responsive bằng CSS', level: 'Easy', order: 1 },
        ],
      },
      {
        title: 'Buổi 2 - JavaScript cơ bản',
        order: 1,
        homeworks: [
          { title: '[Medium] Viết hàm tính điểm trung bình', level: 'Medium', order: 0 },
          { title: '[Medium] Tạo todo-list bằng vanilla JS', level: 'Medium', order: 1 },
        ],
      },
      {
        title: 'Buổi 3 - ReactJS - Component & Props',
        order: 2,
        homeworks: [
          { title: '[Medium] Tạo Card Component tái sử dụng', level: 'Medium', order: 0 },
          { title: '[Hard] Xây dựng danh sách sản phẩm với filter', level: 'Hard', order: 1 },
        ],
      },
      {
        title: 'Buổi 4 - useState & useEffect',
        order: 3,
        homeworks: [
          { title: '[Medium] Xây dựng bộ đếm (counter) có reset', level: 'Medium', order: 0 },
          { title: '[Hard] Fetch API và hiển thị danh sách users', level: 'Hard', order: 1 },
        ],
      },
      {
        title: 'Buổi 5 - React Router & Navigation',
        order: 4,
        homeworks: [
          { title: '[Hard] Xây dựng mini SPA với React Router', level: 'Hard', order: 0 },
        ],
      },
    ];

    for (const ld of lessonData) {
      const lesson = await prisma.lesson.create({
        data: {
          title: ld.title,
          order: ld.order,
          courseId: course.id,
          status: 'published',
          content: `<p>Nội dung buổi học: ${ld.title}</p>`,
        },
      });

      for (const hw of ld.homeworks) {
        await prisma.homework.create({
          data: {
            lessonId: lesson.id,
            title: hw.title,
            level: hw.level,
            order: hw.order,
            description: `<p>Yêu cầu: ${hw.title}</p><p>Nộp bài qua Github, thêm link repo vào phần submit.</p>`,
          },
        });
      }

      console.log(`  ✅ Tạo ${ld.title} với ${ld.homeworks.length} bài tập`);
    }

    // Reload course với lessons và homeworks
    course = await prisma.course.findUnique({
      where: { id: course.id },
      include: {
        lessons: {
          include: { homeworks: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    lessonsWithHomework = course.lessons.filter(l => l.homeworks.length > 0);
  } else {
    console.log(`\n✅ Dùng course sẵn có: "${course.title}" (${course.id})`);
    console.log(`   Có ${lessonsWithHomework.length} buổi học với homework`);
  }

  // =========================================================
  // 3. Tạo Class có ClassSchedule thực tế
  // =========================================================
  // Tính toán startDate: 3 tuần trước (để đã có 3 buổi học)
  // Lớp học vào Thứ 2 và Thứ 4 (dayOfWeek: [2, 4])
  const today = new Date();
  
  // Tìm ngày Thứ 2 cách đây 3 tuần
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 21); // 3 tuần trước
  // Điều chỉnh về đúng Thứ 2 (dayOfWeek = 1 trong JS)
  while (startDate.getDay() !== 1) {
    startDate.setDate(startDate.getDate() + 1);
  }
  startDate.setHours(19, 0, 0, 0); // Buổi tối 19h

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 90); // Khóa 3 tháng

  // Kiểm tra xem lớp test đã tồn tại chưa
  let existingClass = await prisma.class.findFirst({
    where: {
      title: { contains: '[TEST BTVN]' },
      courseId: course.id,
    },
    include: { schedule: true, enrollments: true },
  });

  let newClass;
  if (existingClass) {
    console.log(`\n✅ Lớp test đã tồn tại: "${existingClass.title}" (${existingClass.id})`);
    newClass = existingClass;
  } else {
    newClass = await prisma.class.create({
      data: {
        title: `[TEST BTVN] ${course.title} - Lớp ${today.getMonth() + 1}/${today.getFullYear()}`,
        courseId: course.id,
        teacherId: teacher.id,
        startDate: startDate,
        endDate: endDate,
        sessionCount: 20,
        status: 'active',
      },
    });

    // Tạo lịch học: Thứ 2 và Thứ 4, Ca tối 19:00-21:00
    await prisma.classSchedule.create({
      data: {
        classId: newClass.id,
        dayOfWeek: [2, 4], // Thứ 2 và Thứ 4 (theo quy ước BE: 2=Mon, 4=Wed)
        shift: 'CA5',
        startTime: '19:00',
        endTime: '21:00',
        note: 'Lớp test cảnh báo BTVN - Tối Thứ 2 và Thứ 4',
      },
    });

    console.log(`\n✅ Tạo lớp mới: "${newClass.title}" (${newClass.id})`);
    console.log(`   StartDate: ${startDate.toLocaleDateString('vi-VN')} | Lịch: Thứ 2, 4 | 19:00-21:00`);
  }

  // =========================================================
  // 4. Enroll students vào lớp
  // =========================================================
  for (const student of students) {
    const existing = await prisma.enrollment.findUnique({
      where: {
        studentId_classId: {
          studentId: student.id,
          classId: newClass.id,
        },
      },
    });

    if (!existing) {
      await prisma.enrollment.create({
        data: {
          studentId: student.id,
          classId: newClass.id,
          courseId: course.id,
          status: 'active',
        },
      });
      console.log(`  ✅ Enrolled: ${student.username} vào lớp`);
    } else {
      console.log(`  ⚠️  ${student.username} đã được enroll rồi`);
    }
  }

  // =========================================================
  // 5. Tạo một số submission mẫu (học viên 1 đã nộp 1 bài, còn 1 bài chưa nộp)
  //    để test trạng thái "Đang làm" và "pending"
  // =========================================================
  const student1 = students[0];
  const lessons = course.lessons;
  
  if (lessons.length > 0 && lessons[0].homeworks.length > 0) {
    const firstHw = lessons[0].homeworks[0];
    
    const alreadySubmitted = await prisma.assignmentSubmission.findFirst({
      where: {
        homeworkId: firstHw.id,
        classId: newClass.id,
        studentId: student1.id,
      },
    });

    if (!alreadySubmitted) {
      await prisma.assignmentSubmission.create({
        data: {
          homeworkId: firstHw.id,
          classId: newClass.id,
          studentId: student1.id,
          githubLink: 'https://github.com/test-student/homework-session1',
          note: 'Bài làm buổi 1',
          isLate: false,
          status: 'SUBMITTED',
        },
      });
      console.log(`\n  ✅ Tạo submission mẫu: ${student1.username} đã nộp "${firstHw.title}"`);
    }
  }

  // =========================================================
  // 6. Tóm tắt kết quả
  // =========================================================
  console.log('\n' + '='.repeat(60));
  console.log('✅ SEED HOÀN TẤT!');
  console.log('='.repeat(60));
  console.log(`\n📌 Thông tin để test:`);
  console.log(`   Course   : "${course.title}"`);
  console.log(`   Class    : "${newClass.title}"`);
  console.log(`   Lịch học : Thứ 2 và Thứ 4 | 19:00-21:00`);
  console.log(`   StartDate: ${startDate.toLocaleDateString('vi-VN')} (3 tuần trước)`);
  console.log(`   Students : ${students.map(s => s.username).join(', ')}`);
  console.log(`\n🎯 Để test cảnh báo BTVN:`);
  console.log(`   1. Đăng nhập bằng tài khoản: ${students[0].username}`);
  console.log(`   2. Vào Dashboard → Xem "Bài tập chưa nộp" và "Việc cần làm ngay"`);
  console.log(`   3. Vào trang "Bài tập" để xem trạng thái chi tiết`);
  console.log(`\n⚠️  Lưu ý về deadline:`);
  console.log(`   - Deadline = Buổi kế tiếp - 12 tiếng`);
  console.log(`   - "Urgent" = còn < 24h đến deadline`);
  console.log(`   - "Overdue" = đã quá deadline`);
  console.log(`   - Lịch học Thứ 2+4 nên deadline thường là Thứ 2 7h sáng và Thứ 4 7h sáng`);
}

main()
  .catch(e => {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
