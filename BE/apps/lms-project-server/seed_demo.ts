import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const p = new PrismaClient();

// ─── IDs từ DB hiện tại ────────────────────────────────────────────
const COURSES = {
  csdl:      { id: '6a1118b1c8ea9bb66d88f79e', title: 'Nhập môn CSDL - PostgreSQL', sessionCount: 3 },
  react:     { id: '6a27b0722cc1672ac4201c49', title: 'Fullstack ReactJS & NodeJS', sessionCount: 5 },
  flutter:   { id: '6a27b0722cc1672ac4201c4f', title: 'Xây dựng App với Flutter', sessionCount: 3 },
};

const LESSONS = {
  // CSDL
  csdl_l1: { id: '6a111c93c8ea9bb66d88f79f', quizIds: ['6a111dfbc8ea9bb66d88f7a9'], videoIds: ['6a1b17a6aea11c271ca9f229','6a1b17a6aea11c271ca9f22a','6a1b17a6aea11c271ca9f22b','6a1b17a6aea11c271ca9f22c','6a1b17a6aea11c271ca9f22d','6a1b17a6aea11c271ca9f22e'] },
  csdl_l2: { id: '6a1128a4c8ea9bb66d88f7d9', quizIds: ['6a1128a4c8ea9bb66d88f7de'], videoIds: ['6a1128a4c8ea9bb66d88f7da','6a1128a4c8ea9bb66d88f7db','6a1128a4c8ea9bb66d88f7dc','6a1128a4c8ea9bb66d88f7dd'] },
  csdl_l3: { id: '6a112d5dc8ea9bb66d88f7eb', quizIds: ['6a112d5dc8ea9bb66d88f7ec'], videoIds: [] },
  // React
  react_l1: { id: '6a27b0722cc1672ac4201c4a', quizIds: ['6a27b9c5f7e8cfd12b1f6426'], videoIds: ['6a27b8afea73faf94bb8445c','6a27b8afea73faf94bb8445d'] },
  react_l2: { id: '6a27b0722cc1672ac4201c4b', quizIds: ['6a27b9c5f7e8cfd12b1f642a'], videoIds: ['6a27b8c8ea73faf94bb84460','6a27b8c8ea73faf94bb84461'] },
  react_l3: { id: '6a27b0722cc1672ac4201c4c', quizIds: ['6a27b9c5f7e8cfd12b1f642e'], videoIds: ['6a27b2bfea73faf94bb84449','6a27b2bfea73faf94bb8444a'] },
  react_l4: { id: '6a27b0722cc1672ac4201c4d', quizIds: [], videoIds: ['6a27b2c3ea73faf94bb8444b','6a27b2c3ea73faf94bb8444c'] },
  react_l5: { id: '6a27b0722cc1672ac4201c4e', quizIds: [], videoIds: ['6a27b2c6ea73faf94bb8444d','6a27b2c6ea73faf94bb8444e'] },
  // Flutter
  flutter_l1: { id: '6a27b0722cc1672ac4201c50', quizIds: [], videoIds: ['6a27b2deea73faf94bb8444f','6a27b2deea73faf94bb84450'] },
  flutter_l2: { id: '6a27b0722cc1672ac4201c51', quizIds: ['6a27b9c5f7e8cfd12b1f6432'], videoIds: ['6a27b2e2ea73faf94bb84451','6a27b2e2ea73faf94bb84452'] },
  flutter_l3: { id: '6a27b0722cc1672ac4201c52', quizIds: [], videoIds: ['6a27b2e5ea73faf94bb84453','6a27b2e5ea73faf94bb84454'] },
};

const TEACHER_ID = '6a277cecc9faeb79e7b8ab38';

// ─── Helpers ─────────────────────────────────────────────────────
function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function ago(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function hashPwd(pwd: string) {
  return bcrypt.hash(pwd, 10);
}

async function main() {
  const password = await hashPwd('Abc@12345');

  // ─── 1. Tạo 20 học viên mới ───────────────────────────────────
  console.log('Creating 20 student accounts...');
  const studentIds: string[] = [];

  // Giữ lại 2 SV cũ
  const existingStudents = await p.user.findMany({ where: { roles: { has: 'STUDENT' }, email: { in: ['hv1@lms.vn', 'hv2@lms.vn'] } }, select: { id: true } });
  existingStudents.forEach(s => studentIds.push(s.id));

  for (let i = 3; i <= 22; i++) {
    const created = await p.user.create({
      data: {
        username: `hv${i}`,
        email: `hv${i}@lms.vn`,
        fullName: `Học viên ${i.toString().padStart(2, '0')}`,
        password,
        roles: ['STUDENT'],
        forcePasswordChange: false,
        status: 'active',
        isEmailVerified: true,
      },
    });
    studentIds.push(created.id);
    console.log(`  Created hv${i}@lms.vn -> ${created.id}`);
  }
  console.log(`Total students: ${studentIds.length}`);

  // ─── 2. Tạo các lớp học ───────────────────────────────────────
  console.log('\nCreating classes...');

  const classes: any[] = [];

  const classesData = [
    // CSDL - Nhập môn
    { title: 'CSDL-K01', courseId: COURSES.csdl.id, status: 'ready',    sessionCount: 3,  startDate: ago(-7),  endDate: ago(-7+60) },
    { title: 'CSDL-K02', courseId: COURSES.csdl.id, status: 'active',   sessionCount: 3,  startDate: ago(14),  endDate: ago(14-60) },
    { title: 'CSDL-K03', courseId: COURSES.csdl.id, status: 'active',   sessionCount: 3,  startDate: ago(30),  endDate: ago(30-60) },
    { title: 'CSDL-K04', courseId: COURSES.csdl.id, status: 'finished', sessionCount: 3,  startDate: ago(90),  endDate: ago(90-60) },
    // ReactJS
    { title: 'REACT-K01', courseId: COURSES.react.id, status: 'ready',   sessionCount: 5, startDate: ago(-3),  endDate: ago(-3+90) },
    { title: 'REACT-K02', courseId: COURSES.react.id, status: 'active',  sessionCount: 5, startDate: ago(20),  endDate: ago(20-90) },
    { title: 'REACT-K03', courseId: COURSES.react.id, status: 'active',  sessionCount: 5, startDate: ago(45),  endDate: ago(45-90) },
    // Flutter
    { title: 'FLUTTER-K01', courseId: COURSES.flutter.id, status: 'ready',  sessionCount: 3, startDate: ago(-5),  endDate: ago(-5+75) },
    { title: 'FLUTTER-K02', courseId: COURSES.flutter.id, status: 'active', sessionCount: 3, startDate: ago(10),  endDate: ago(10-75) },
    { title: 'FLUTTER-K03', courseId: COURSES.flutter.id, status: 'active', sessionCount: 3, startDate: ago(25),  endDate: ago(25-75) },
  ];

  for (const cd of classesData) {
    const cls = await p.class.create({
      data: {
        title: cd.title,
        courseId: cd.courseId,
        teacherId: TEACHER_ID,
        managerId: TEACHER_ID,
        status: cd.status,
        sessionCount: cd.sessionCount,
        startDate: cd.startDate,
        endDate: cd.endDate,
      },
    });
    classes.push({ ...cls, courseId: cd.courseId, sessionCount: cd.sessionCount });
    console.log(`  Created class ${cd.title} (${cd.status}) -> ${cls.id}`);
  }

  // ─── 3. Enroll học viên rải vào các lớp ────────────────────────
  // Phân bổ: một số HV vào 2-3 lớp, đa số 1 lớp
  // HV 1-2 (cũ), HV 3-22 (mới)
  const activeClasses = classes.filter(c => c.status === 'active' || c.status === 'ready');
  const csdlK02 = classes.find(c => c.title === 'CSDL-K02')!;
  const csdlK03 = classes.find(c => c.title === 'CSDL-K03')!;
  const reactK02 = classes.find(c => c.title === 'REACT-K02')!;
  const reactK03 = classes.find(c => c.title === 'REACT-K03')!;
  const flutterK02 = classes.find(c => c.title === 'FLUTTER-K02')!;
  const flutterK03 = classes.find(c => c.title === 'FLUTTER-K03')!;

  // Phân nhóm HV vào lớp (index 0=hv1, 1=hv2, 2=hv3 ...)
  const enrollments: {studentId: string, classObj: any}[] = [
    // nhóm CSDL-K02 (hv1..hv7)
    ...studentIds.slice(0, 7).map(id => ({ studentId: id, classObj: csdlK02 })),
    // nhóm REACT-K02 (hv3..hv11)
    ...studentIds.slice(2, 11).map(id => ({ studentId: id, classObj: reactK02 })),
    // nhóm FLUTTER-K02 (hv8..hv15)
    ...studentIds.slice(7, 15).map(id => ({ studentId: id, classObj: flutterK02 })),
    // nhóm CSDL-K03 (hv12..hv16)
    ...studentIds.slice(11, 16).map(id => ({ studentId: id, classObj: csdlK03 })),
    // nhóm REACT-K03 (hv14..hv19)
    ...studentIds.slice(13, 19).map(id => ({ studentId: id, classObj: reactK03 })),
    // nhóm FLUTTER-K03 (hv17..hv22)
    ...studentIds.slice(16, 22).map(id => ({ studentId: id, classObj: flutterK03 })),
  ];

  const enrollMap: Map<string, string[]> = new Map(); // studentId -> [classId]
  console.log('\nEnrolling students...');
  for (const en of enrollments) {
    const key = en.studentId;
    // tránh enroll cùng lớp 2 lần
    const existing = await p.enrollment.findFirst({ where: { studentId: en.studentId, classId: en.classObj.id } });
    if (!existing) {
      await p.enrollment.create({
        data: {
          studentId: en.studentId,
          classId: en.classObj.id,
          courseId: en.classObj.courseId,
          status: 'active',
        },
      });
    }
    if (!enrollMap.has(key)) enrollMap.set(key, []);
    enrollMap.get(key)!.push(en.classObj.id);
  }
  console.log(`  Enrolled done.`);

  // ─── 4. Xử lý từng trường hợp học viên ─────────────────────────
  // Nhóm theo trường hợp trong REACT-K02 (courseId = react, sessionCount=5)
  const reactStudents = studentIds.slice(2, 11); // hv3..hv11 (9 SV)
  // Case A: Đầy đủ, đủ ĐK thi (hv3, hv4, hv5)
  const caseA = reactStudents.slice(0, 3);
  // Case B: Thiếu quiz/e-learning (hv6, hv7)
  const caseB = reactStudents.slice(3, 5);
  // Case C: Nghỉ nhiều, ko đủ chuyên cần (hv8, hv9)
  const caseC = reactStudents.slice(5, 7);
  // Case D: Đang học nửa chừng (hv10, hv11)
  const caseD = reactStudents.slice(7, 9);

  const reactLessons = [LESSONS.react_l1, LESSONS.react_l2, LESSONS.react_l3, LESSONS.react_l4, LESSONS.react_l5];

  // ─ Case A: Đầy đủ (5/5 buổi present, 3/3 quiz pass, tất cả video done)
  console.log('\nCase A: Full completion students...');
  for (const sid of caseA) {
    // Điểm danh đủ 5 buổi
    for (let sess = 1; sess <= 5; sess++) {
      const existing = await p.attendance.findFirst({ where: { classId: reactK02.id, studentId: sid, sessionNumber: sess } });
      if (!existing) await p.attendance.create({ data: { classId: reactK02.id, studentId: sid, sessionNumber: sess, date: ago(20 - sess*3), status: 'present' } });
    }
    // Làm quiz tất cả pass
    for (const l of reactLessons) {
      for (const qid of l.quizIds) {
        const existing = await p.quizAttempt.findFirst({ where: { quizId: qid, studentId: sid } });
        if (!existing) await p.quizAttempt.create({ data: { quizId: qid, studentId: sid, score: rnd(80, 100) / 10, totalCorrect: rnd(8, 10), passed: true, answers: [] } });
      }
      // Xem tất cả video
      if (l.videoIds.length > 0) {
        const existing = await p.progress.findFirst({ where: { lessonId: l.id, studentId: sid } });
        if (!existing) await p.progress.create({ data: { lessonId: l.id, studentId: sid, completed: true, completionStatus: 'COMPLETED', completedAt: ago(15), completedItems: l.videoIds } });
      }
    }
  }

  // ─ Case B: Thiếu quiz + thiếu một số video
  console.log('Case B: Missing e-learning students...');
  for (const sid of caseB) {
    // Điểm danh đủ 5 buổi
    for (let sess = 1; sess <= 5; sess++) {
      const existing = await p.attendance.findFirst({ where: { classId: reactK02.id, studentId: sid, sessionNumber: sess } });
      if (!existing) await p.attendance.create({ data: { classId: reactK02.id, studentId: sid, sessionNumber: sess, date: ago(20 - sess*3), status: 'present' } });
    }
    // Chỉ làm được 1 quiz đầu (bỏ quiz 2,3)
    const qid = LESSONS.react_l1.quizIds[0];
    const existing = await p.quizAttempt.findFirst({ where: { quizId: qid, studentId: sid } });
    if (!existing) await p.quizAttempt.create({ data: { quizId: qid, studentId: sid, score: 9.0, totalCorrect: 9, passed: true, answers: [] } });
    // Chỉ xem video bài 1
    const existing2 = await p.progress.findFirst({ where: { lessonId: LESSONS.react_l1.id, studentId: sid } });
    if (!existing2) await p.progress.create({ data: { lessonId: LESSONS.react_l1.id, studentId: sid, completed: true, completionStatus: 'COMPLETED', completedAt: ago(18), completedItems: LESSONS.react_l1.videoIds } });
  }

  // ─ Case C: Nghỉ nhiều (>20% buổi vắng mặt)
  console.log('Case C: Poor attendance students...');
  for (const sid of caseC) {
    // 5 buổi: present 3, absent 2 -> 40% vắng > 20% ngưỡng
    const schedule = [
      { sess: 1, status: 'present' },
      { sess: 2, status: 'absent' },
      { sess: 3, status: 'present' },
      { sess: 4, status: 'absent' },
      { sess: 5, status: 'present' },
    ];
    for (const s of schedule) {
      const existing = await p.attendance.findFirst({ where: { classId: reactK02.id, studentId: sid, sessionNumber: s.sess } });
      if (!existing) await p.attendance.create({ data: { classId: reactK02.id, studentId: sid, sessionNumber: s.sess, date: ago(20 - s.sess*3), status: s.status } });
    }
    // Quiz đầy đủ và pass
    for (const l of [LESSONS.react_l1, LESSONS.react_l2, LESSONS.react_l3]) {
      for (const qid of l.quizIds) {
        const existing = await p.quizAttempt.findFirst({ where: { quizId: qid, studentId: sid } });
        if (!existing) await p.quizAttempt.create({ data: { quizId: qid, studentId: sid, score: 8.5, totalCorrect: 9, passed: true, answers: [] } });
      }
      if (l.videoIds.length > 0) {
        const existing = await p.progress.findFirst({ where: { lessonId: l.id, studentId: sid } });
        if (!existing) await p.progress.create({ data: { lessonId: l.id, studentId: sid, completed: true, completionStatus: 'COMPLETED', completedAt: ago(14), completedItems: l.videoIds } });
      }
    }
  }

  // ─ Case D: Đang học nửa chừng (3/5 buổi, 2/3 quiz)
  console.log('Case D: Mid-progress students...');
  for (const sid of caseD) {
    // Điểm danh 3 buổi đầu
    for (let sess = 1; sess <= 3; sess++) {
      const existing = await p.attendance.findFirst({ where: { classId: reactK02.id, studentId: sid, sessionNumber: sess } });
      if (!existing) await p.attendance.create({ data: { classId: reactK02.id, studentId: sid, sessionNumber: sess, date: ago(20 - sess*3), status: 'present' } });
    }
    // Quiz 2 bài đầu pass
    for (const l of [LESSONS.react_l1, LESSONS.react_l2]) {
      for (const qid of l.quizIds) {
        const existing = await p.quizAttempt.findFirst({ where: { quizId: qid, studentId: sid } });
        if (!existing) await p.quizAttempt.create({ data: { quizId: qid, studentId: sid, score: 8.0, totalCorrect: 8, passed: true, answers: [] } });
      }
      if (l.videoIds.length > 0) {
        const existing = await p.progress.findFirst({ where: { lessonId: l.id, studentId: sid } });
        if (!existing) await p.progress.create({ data: { lessonId: l.id, studentId: sid, completed: true, completionStatus: 'COMPLETED', completedAt: ago(12), completedItems: l.videoIds } });
      }
    }
    // Bài 3 đang xem dở (progress nhưng chưa completed)
    const existing = await p.progress.findFirst({ where: { lessonId: LESSONS.react_l3.id, studentId: sid } });
    if (!existing) await p.progress.create({ data: { lessonId: LESSONS.react_l3.id, studentId: sid, completed: false, completionStatus: 'PENDING', completedItems: [LESSONS.react_l3.videoIds[0]] } });
  }

  console.log('\n✅ Seed data complete!');
  console.log('Summary:');
  console.log(`  - 20 student accounts created (hv3@lms.vn - hv22@lms.vn)`);
  console.log(`  - 10 classes created (CSDL x4, React x3, Flutter x3)`);
  console.log(`  - Students enrolled across classes`);
  console.log(`  - Case A (hv3-hv5): Full completion - đủ ĐK thi`);
  console.log(`  - Case B (hv6-hv7): Missing e-learning - không đủ ĐK thi (quiz/video)`);
  console.log(`  - Case C (hv8-hv9): Poor attendance - không đủ ĐK thi (vắng 40%)`);
  console.log(`  - Case D (hv10-hv11): Mid-progress - đang học nửa chừng`);
}

main().catch(console.error).finally(() => p.$disconnect());
