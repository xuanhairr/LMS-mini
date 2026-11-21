import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

function ago(days: number) { const d = new Date(); d.setDate(d.getDate() - days); return d; }
function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const CLASSES = {
  csdlK01:    { id: '6a357263b18f34c982a37d90', courseId: '6a1118b1c8ea9bb66d88f79e' },
  csdlK04:    { id: '6a357263b18f34c982a37d93', courseId: '6a1118b1c8ea9bb66d88f79e' },
  reactK01:   { id: '6a357263b18f34c982a37d94', courseId: '6a27b0722cc1672ac4201c49' },
  flutterK01: { id: '6a357263b18f34c982a37d97', courseId: '6a27b0722cc1672ac4201c4f' },
};

const CSDL_LESSONS = [
  { id: '6a111c93c8ea9bb66d88f79f', quizIds: ['6a111dfbc8ea9bb66d88f7a9'], videoIds: ['6a1b17a6aea11c271ca9f229','6a1b17a6aea11c271ca9f22a','6a1b17a6aea11c271ca9f22b'] },
  { id: '6a1128a4c8ea9bb66d88f7d9', quizIds: ['6a1128a4c8ea9bb66d88f7de'], videoIds: ['6a1128a4c8ea9bb66d88f7da','6a1128a4c8ea9bb66d88f7db'] },
  { id: '6a112d5dc8ea9bb66d88f7eb', quizIds: ['6a112d5dc8ea9bb66d88f7ec'], videoIds: [] },
];

const REACT_LESSONS = [
  { id: '6a27b0722cc1672ac4201c4a', quizIds: ['6a27b9c5f7e8cfd12b1f6426'], videoIds: ['6a27b8afea73faf94bb8445c','6a27b8afea73faf94bb8445d'] },
  { id: '6a27b0722cc1672ac4201c4b', quizIds: ['6a27b9c5f7e8cfd12b1f642a'], videoIds: ['6a27b8c8ea73faf94bb84460','6a27b8c8ea73faf94bb84461'] },
  { id: '6a27b0722cc1672ac4201c4c', quizIds: ['6a27b9c5f7e8cfd12b1f642e'], videoIds: ['6a27b2bfea73faf94bb84449','6a27b2bfea73faf94bb8444a'] },
  { id: '6a27b0722cc1672ac4201c4d', quizIds: [], videoIds: ['6a27b2c3ea73faf94bb8444b','6a27b2c3ea73faf94bb8444c'] },
  { id: '6a27b0722cc1672ac4201c4e', quizIds: [], videoIds: ['6a27b2c6ea73faf94bb8444d','6a27b2c6ea73faf94bb8444e'] },
];

const FLUTTER_LESSONS = [
  { id: '6a27b0722cc1672ac4201c50', quizIds: [], videoIds: ['6a27b2deea73faf94bb8444f','6a27b2deea73faf94bb84450'] },
  { id: '6a27b0722cc1672ac4201c51', quizIds: ['6a27b9c5f7e8cfd12b1f6432'], videoIds: ['6a27b2e2ea73faf94bb84451','6a27b2e2ea73faf94bb84452'] },
  { id: '6a27b0722cc1672ac4201c52', quizIds: [], videoIds: ['6a27b2e5ea73faf94bb84453','6a27b2e5ea73faf94bb84454'] },
];

async function getSid(email: string): Promise<string> {
  const u = await p.user.findUnique({ where: { email } });
  if (!u) throw new Error(`Not found: ${email}`);
  return u.id;
}

async function enroll(sid: string, cls: { id: string; courseId: string }) {
  const ex = await p.enrollment.findFirst({ where: { studentId: sid, classId: cls.id } });
  if (!ex) await p.enrollment.create({ data: { studentId: sid, classId: cls.id, courseId: cls.courseId, status: 'active' } });
}

async function doFullAttend(classId: string, sid: string, sessions: number, daysAgo: number) {
  for (let s = 1; s <= sessions; s++) {
    const ex = await p.attendance.findFirst({ where: { classId, studentId: sid, sessionNumber: s } });
    if (!ex) await p.attendance.create({ data: { classId, studentId: sid, sessionNumber: s, date: ago(daysAgo - s * 5), status: 'present' } });
  }
}

async function doFullElearning(sid: string, lessons: typeof CSDL_LESSONS, daysAgo: number) {
  for (const l of lessons) {
    for (const qid of l.quizIds) {
      const ex = await p.quizAttempt.findFirst({ where: { quizId: qid, studentId: sid } });
      if (!ex) await p.quizAttempt.create({ data: { quizId: qid, studentId: sid, score: rnd(80, 100) / 10, totalCorrect: rnd(8, 10), passed: true, answers: [] } });
    }
    if (l.videoIds.length > 0) {
      const ex = await p.progress.findFirst({ where: { lessonId: l.id, studentId: sid } });
      if (!ex) await p.progress.create({ data: { lessonId: l.id, studentId: sid, completed: true, completionStatus: 'COMPLETED', completedAt: ago(daysAgo), completedItems: l.videoIds } });
    }
  }
}

async function main() {

  // ── CSDL-K01 (Sẵn sàng): ghi danh trước, chưa có buổi học nào
  console.log('=== CSDL-K01 (ready) ===');
  const csdlK01Students = ['hv1@lms.vn', 'hv2@lms.vn', 'hv20@lms.vn', 'hv21@lms.vn', 'hv22@lms.vn'];
  for (const email of csdlK01Students) {
    const sid = await getSid(email);
    await enroll(sid, CLASSES.csdlK01);
    console.log(`  Enrolled ${email}`);
  }

  // ── REACT-K01 (Sẵn sàng): ghi danh trước
  console.log('=== REACT-K01 (ready) ===');
  const reactK01Students = ['hv20@lms.vn', 'hv21@lms.vn', 'hv22@lms.vn', 'hv1@lms.vn', 'hv2@lms.vn', 'hv6@lms.vn', 'hv7@lms.vn'];
  for (const email of reactK01Students) {
    const sid = await getSid(email);
    await enroll(sid, CLASSES.reactK01);
    console.log(`  Enrolled ${email}`);
  }

  // ── FLUTTER-K01 (Sẵn sàng): ghi danh trước
  console.log('=== FLUTTER-K01 (ready) ===');
  const flutterK01Students = ['hv6@lms.vn', 'hv7@lms.vn', 'hv16@lms.vn', 'hv22@lms.vn', 'hv21@lms.vn', 'hv20@lms.vn'];
  for (const email of flutterK01Students) {
    const sid = await getSid(email);
    await enroll(sid, CLASSES.flutterK01);
    console.log(`  Enrolled ${email}`);
  }

  // ── CSDL-K04 (Kết thúc): lớp đã học xong - có đủ điểm danh, bài tập, quiz
  //    Thêm học viên hoàn thành đầy đủ và nhập điểm thi cuối khóa
  console.log('=== CSDL-K04 (finished) ===');
  const k04Students = [
    { email: 'hv3@lms.vn',  examScore: 8.5 },
    { email: 'hv4@lms.vn',  examScore: 9.0 },
    { email: 'hv5@lms.vn',  examScore: 7.5 },
    { email: 'hv8@lms.vn',  examScore: 6.0 },
    { email: 'hv9@lms.vn',  examScore: 8.0 },
    { email: 'hv16@lms.vn', examScore: 5.5 },
    { email: 'hv17@lms.vn', examScore: 9.5 },
    { email: 'hv18@lms.vn', examScore: 4.0 }, // rớt
    { email: 'hv19@lms.vn', examScore: 7.0 },
    { email: 'hv20@lms.vn', examScore: 8.0 },
  ];

  for (const { email, examScore } of k04Students) {
    const sid = await getSid(email);
    await enroll(sid, CLASSES.csdlK04);
    await doFullAttend(CLASSES.csdlK04.id, sid, 3, 90);
    await doFullElearning(sid, CSDL_LESSONS, 80);
    // Điểm thi cuối khóa
    const exScore = await p.examScore.findFirst({ where: { classId: CLASSES.csdlK04.id, studentId: sid } });
    if (!exScore) {
      await p.examScore.create({ data: { classId: CLASSES.csdlK04.id, studentId: sid, score: examScore } });
    }
    console.log(`  ${email}: enrolled + full data + exam=${examScore}`);
  }

  console.log('\n✅ All ready/finished classes now have students!');
}

main().catch(console.error).finally(() => p.$disconnect());
