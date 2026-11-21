/**
 * Script xoá TOÀN BỘ dữ liệu, chỉ GIỮ LẠI accounts (User)
 * - Mật khẩu: GIỮ NGUYÊN
 * - forcePasswordChange: GIỮ NGUYÊN (false = đăng nhập bình thường)
 * - isEmailVerified: GIỮ NGUYÊN
 *
 * Cách chạy: node scripts/clear-all-except-users.js
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('🗑️  Bắt đầu xoá dữ liệu (giữ lại User accounts)...\n');

  // --- In danh sách user sẽ giữ lại ---
  const users = await p.user.findMany({
    select: { username: true, roles: true, fullName: true, forcePasswordChange: true, isEmailVerified: true }
  });
  console.log(`👥 Giữ lại ${users.length} accounts:`);
  users.forEach(u => console.log(`   [${u.roles.join(',')}] ${u.username} | forcePasswordChange=${u.forcePasswordChange} | emailVerified=${u.isEmailVerified}`));
  console.log('');

  // --- Xoá theo thứ tự dependency (con trước, cha sau) ---

  const r1 = await p.notification.deleteMany({});
  console.log(`✅ Notifications:          xoá ${r1.count}`);

  const r2 = await p.assignmentSubmission.deleteMany({});
  console.log(`✅ AssignmentSubmissions:  xoá ${r2.count}`);

  const r3 = await p.quizAttempt.deleteMany({});
  console.log(`✅ QuizAttempts:           xoá ${r3.count}`);

  const r4 = await p.progress.deleteMany({});
  console.log(`✅ Progresses:             xoá ${r4.count}`);

  const r5 = await p.enrollment.deleteMany({});
  console.log(`✅ Enrollments:            xoá ${r5.count}`);

  const r6 = await p.classSchedule.deleteMany({});
  console.log(`✅ ClassSchedules:         xoá ${r6.count}`);

  const r7 = await p.class.deleteMany({});
  console.log(`✅ Classes:                xoá ${r7.count}`);

  const r8 = await p.homework.deleteMany({});
  console.log(`✅ Homeworks:              xoá ${r8.count}`);

  const r9 = await p.attachment.deleteMany({});
  console.log(`✅ Attachments:            xoá ${r9.count}`);

  const r10 = await p.question.deleteMany({});
  console.log(`✅ Questions:              xoá ${r10.count}`);

  const r11 = await p.quiz.deleteMany({});
  console.log(`✅ Quizzes:                xoá ${r11.count}`);

  const r12 = await p.video.deleteMany({});
  console.log(`✅ Videos:                 xoá ${r12.count}`);

  const r13 = await p.lesson.deleteMany({});
  console.log(`✅ Lessons:                xoá ${r13.count}`);

  const r14 = await p.course.deleteMany({});
  console.log(`✅ Courses:                xoá ${r14.count}`);

  // Shift (ca học cấu hình) - tuỳ bạn có muốn giữ không
  // const r15 = await p.shift.deleteMany({});
  // console.log(`✅ Shifts:                 xoá ${r15.count}`);

  // Role - GIỮ LẠI (dữ liệu cấu hình hệ thống)
  console.log(`ℹ️  Roles & Shifts:         GIỮ NGUYÊN`);

  console.log('\n' + '='.repeat(50));
  console.log('✅ XONG! Tất cả data đã xoá, accounts vẫn còn nguyên.');
  console.log('='.repeat(50));

  // --- Xác nhận lại ---
  const remaining = await p.user.count();
  const remainingCourses = await p.course.count();
  console.log(`\n📊 Kiểm tra sau xoá:`);
  console.log(`   Users còn lại  : ${remaining}`);
  console.log(`   Courses còn lại: ${remainingCourses}`);
}

main()
  .catch(e => {
    console.error('❌ Lỗi:', e.message);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
