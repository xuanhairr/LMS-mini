import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function ago(days: number) { const d = new Date(); d.setDate(d.getDate() - days); return d; }

// ── IDs ──────────────────────────────────────────────────────────
const CLASSES = {
  csdlK02:    '6a357263b18f34c982a37d91',
  csdlK03:    '6a357263b18f34c982a37d92',
  reactK02:   '6a357263b18f34c982a37d95',
  reactK03:   '6a357263b18f34c982a37d96',
  flutterK02: '6a357263b18f34c982a37d98',
  flutterK03: '6a357263b18f34c982a37d99',
};

// CSDL lessons (3 buổi)
const CSDL_LESSONS = [
  { id: '6a111c93c8ea9bb66d88f79f', quizIds: ['6a111dfbc8ea9bb66d88f7a9'], videoIds: ['6a1b17a6aea11c271ca9f229','6a1b17a6aea11c271ca9f22a','6a1b17a6aea11c271ca9f22b'] },
  { id: '6a1128a4c8ea9bb66d88f7d9', quizIds: ['6a1128a4c8ea9bb66d88f7de'], videoIds: ['6a1128a4c8ea9bb66d88f7da','6a1128a4c8ea9bb66d88f7db'] },
  { id: '6a112d5dc8ea9bb66d88f7eb', quizIds: ['6a112d5dc8ea9bb66d88f7ec'], videoIds: [] },
];

// Flutter lessons (3 buổi)
const FLUTTER_LESSONS = [
  { id: '6a27b0722cc1672ac4201c50', quizIds: [], videoIds: ['6a27b2deea73faf94bb8444f','6a27b2deea73faf94bb84450'] },
  { id: '6a27b0722cc1672ac4201c51', quizIds: ['6a27b9c5f7e8cfd12b1f6432'], videoIds: ['6a27b2e2ea73faf94bb84451','6a27b2e2ea73faf94bb84452'] },
  { id: '6a27b0722cc1672ac4201c52', quizIds: [], videoIds: ['6a27b2e5ea73faf94bb84453','6a27b2e5ea73faf94bb84454'] },
];

// React lessons (5 buổi)
const REACT_LESSONS = [
  { id: '6a27b0722cc1672ac4201c4a', quizIds: ['6a27b9c5f7e8cfd12b1f6426'], videoIds: ['6a27b8afea73faf94bb8445c','6a27b8afea73faf94bb8445d'] },
  { id: '6a27b0722cc1672ac4201c4b', quizIds: ['6a27b9c5f7e8cfd12b1f642a'], videoIds: ['6a27b8c8ea73faf94bb84460','6a27b8c8ea73faf94bb84461'] },
  { id: '6a27b0722cc1672ac4201c4c', quizIds: ['6a27b9c5f7e8cfd12b1f642e'], videoIds: ['6a27b2bfea73faf94bb84449','6a27b2bfea73faf94bb8444a'] },
  { id: '6a27b0722cc1672ac4201c4d', quizIds: [], videoIds: ['6a27b2c3ea73faf94bb8444b','6a27b2c3ea73faf94bb8444c'] },
  { id: '6a27b0722cc1672ac4201c4e', quizIds: [], videoIds: ['6a27b2c6ea73faf94bb8444d','6a27b2c6ea73faf94bb8444e'] },
];

// ── Helpers ───────────────────────────────────────────────────────
async function doAttendance(classId: string, sid: string, totalSessions: number, presentCount: number, daysAgo: number) {
  for (let sess = 1; sess <= totalSessions; sess++) {
    const existing = await p.attendance.findFirst({ where: { classId, studentId: sid, sessionNumber: sess } });
    if (!existing) {
      const status = sess <= presentCount ? 'present' : 'absent';
      await p.attendance.create({ data: { classId, studentId: sid, sessionNumber: sess, date: ago(daysAgo - sess * 3), status } });
    }
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

async function doPartialElearning(sid: string, lessons: typeof CSDL_LESSONS, doneLessons: number) {
  for (let i = 0; i < doneLessons; i++) {
    const l = lessons[i];
    for (const qid of l.quizIds) {
      const ex = await p.quizAttempt.findFirst({ where: { quizId: qid, studentId: sid } });
      if (!ex) await p.quizAttempt.create({ data: { quizId: qid, studentId: sid, score: 8.5, totalCorrect: 9, passed: true, answers: [] } });
    }
    if (l.videoIds.length > 0) {
      const ex = await p.progress.findFirst({ where: { lessonId: l.id, studentId: sid } });
      if (!ex) await p.progress.create({ data: { lessonId: l.id, studentId: sid, completed: true, completionStatus: 'COMPLETED', completedAt: ago(20), completedItems: l.videoIds } });
    }
  }
}

// ── Lấy studentId theo email ──────────────────────────────────────
async function getSid(email: string): Promise<string> {
  const u = await p.user.findUnique({ where: { email } });
  if (!u) throw new Error(`Not found: ${email}`);
  return u.id;
}

async function main() {
  // ══════════════════════════════════════════════════════════════
  // CSDL-K02: hv1, hv2, hv3, hv4, hv5, hv6, hv7
  // hv1 & hv2: Hoàn thành đầy đủ (học xong)
  // hv3-hv5: đã có data (case A react), thêm CSDL pass
  // hv6-hv7: đã có data (case B react), thêm CSDL mid-progress
  // ══════════════════════════════════════════════════════════════
  console.log('\n=== CSDL-K02 ===');

  // hv1, hv2 - hoàn thành đầy đủ CSDL
  for (const email of ['hv1@lms.vn', 'hv2@lms.vn']) {
    const sid = await getSid(email);
    console.log(`  ${email}: full CSDL completion`);
    await doAttendance(CLASSES.csdlK02, sid, 3, 3, 30);
    await doFullElearning(sid, CSDL_LESSONS, 25);
  }
  // hv3, hv4, hv5 - cũng đủ điều kiện CSDL
  for (const email of ['hv3@lms.vn', 'hv4@lms.vn', 'hv5@lms.vn']) {
    const sid = await getSid(email);
    console.log(`  ${email}: full CSDL completion`);
    await doAttendance(CLASSES.csdlK02, sid, 3, 3, 28);
    await doFullElearning(sid, CSDL_LESSONS, 22);
  }
  // hv6 - nghỉ 1 buổi, quiz thiếu
  for (const email of ['hv6@lms.vn']) {
    const sid = await getSid(email);
    console.log(`  ${email}: CSDL 2/3 attend, quiz missing`);
    await doAttendance(CLASSES.csdlK02, sid, 3, 2, 28);
    await doPartialElearning(sid, CSDL_LESSONS, 1);
  }
  // hv7 - đang học nửa chừng
  for (const email of ['hv7@lms.vn']) {
    const sid = await getSid(email);
    console.log(`  ${email}: CSDL mid-progress`);
    await doAttendance(CLASSES.csdlK02, sid, 3, 2, 25);
    await doPartialElearning(sid, CSDL_LESSONS, 2);
  }

  // ══════════════════════════════════════════════════════════════
  // FLUTTER-K02: hv8, hv9, hv10, hv11, hv12, hv13, hv14, hv15
  // hv8-hv9: đang REACT-K02 nghỉ nhiều -> FLUTTER full OK
  // hv10-hv11: REACT-K02 nửa chừng -> FLUTTER cũng nửa chừng
  // hv12-hv13: mới hoàn toàn -> Flutter full completion
  // hv14-hv15: Flutter thiếu e-learning
  // ══════════════════════════════════════════════════════════════
  console.log('\n=== FLUTTER-K02 ===');

  for (const email of ['hv8@lms.vn', 'hv9@lms.vn', 'hv12@lms.vn', 'hv13@lms.vn']) {
    const sid = await getSid(email);
    console.log(`  ${email}: Flutter full completion`);
    await doAttendance(CLASSES.flutterK02, sid, 3, 3, 20);
    await doFullElearning(sid, FLUTTER_LESSONS, 15);
  }
  for (const email of ['hv10@lms.vn', 'hv11@lms.vn']) {
    const sid = await getSid(email);
    console.log(`  ${email}: Flutter mid-progress`);
    await doAttendance(CLASSES.flutterK02, sid, 3, 2, 15);
    await doPartialElearning(sid, FLUTTER_LESSONS, 1);
  }
  for (const email of ['hv14@lms.vn', 'hv15@lms.vn']) {
    const sid = await getSid(email);
    console.log(`  ${email}: Flutter full attend, no elearning`);
    await doAttendance(CLASSES.flutterK02, sid, 3, 3, 18);
    // không làm quiz/video gì cả
  }

  // ══════════════════════════════════════════════════════════════
  // CSDL-K03: hv12, hv13, hv14, hv15, hv16 - đang học active
  // ══════════════════════════════════════════════════════════════
  console.log('\n=== CSDL-K03 ===');

  for (const email of ['hv12@lms.vn', 'hv13@lms.vn']) {
    const sid = await getSid(email);
    console.log(`  ${email}: CSDL-K03 full`);
    await doAttendance(CLASSES.csdlK03, sid, 3, 3, 10);
    await doFullElearning(sid, CSDL_LESSONS, 8);
  }
  for (const email of ['hv14@lms.vn', 'hv15@lms.vn', 'hv16@lms.vn']) {
    const sid = await getSid(email);
    console.log(`  ${email}: CSDL-K03 mid`);
    await doAttendance(CLASSES.csdlK03, sid, 3, 2, 10);
    await doPartialElearning(sid, CSDL_LESSONS, 1);
  }

  // ══════════════════════════════════════════════════════════════
  // REACT-K03: hv14, hv15, hv16, hv17, hv18, hv19
  // ══════════════════════════════════════════════════════════════
  console.log('\n=== REACT-K03 ===');

  for (const email of ['hv14@lms.vn', 'hv15@lms.vn']) {
    const sid = await getSid(email);
    console.log(`  ${email}: React-K03 full`);
    await doAttendance(CLASSES.reactK03, sid, 5, 5, 12);
    await doFullElearning(sid, REACT_LESSONS, 10);
  }
  for (const email of ['hv16@lms.vn', 'hv17@lms.vn']) {
    const sid = await getSid(email);
    console.log(`  ${email}: React-K03 mid`);
    await doAttendance(CLASSES.reactK03, sid, 5, 3, 12);
    await doPartialElearning(sid, REACT_LESSONS, 2);
  }
  for (const email of ['hv18@lms.vn', 'hv19@lms.vn']) {
    const sid = await getSid(email);
    console.log(`  ${email}: React-K03 absent heavy`);
    await doAttendance(CLASSES.reactK03, sid, 5, 2, 12); // 40% vắng
    await doPartialElearning(sid, REACT_LESSONS, 1);
  }

  // ══════════════════════════════════════════════════════════════
  // FLUTTER-K03: hv17, hv18, hv19, hv20, hv21, hv22
  // ══════════════════════════════════════════════════════════════
  console.log('\n=== FLUTTER-K03 ===');

  for (const email of ['hv17@lms.vn', 'hv20@lms.vn', 'hv21@lms.vn']) {
    const sid = await getSid(email);
    console.log(`  ${email}: Flutter-K03 full`);
    await doAttendance(CLASSES.flutterK03, sid, 3, 3, 8);
    await doFullElearning(sid, FLUTTER_LESSONS, 6);
  }
  for (const email of ['hv18@lms.vn', 'hv19@lms.vn']) {
    const sid = await getSid(email);
    console.log(`  ${email}: Flutter-K03 mid`);
    await doAttendance(CLASSES.flutterK03, sid, 3, 2, 8);
    await doPartialElearning(sid, FLUTTER_LESSONS, 1);
  }
  for (const email of ['hv22@lms.vn']) {
    const sid = await getSid(email);
    console.log(`  ${email}: Flutter-K03 full attend, missing quiz`);
    await doAttendance(CLASSES.flutterK03, sid, 3, 3, 8);
    // chỉ xem video bài 1, không làm quiz bài 2
    const l = FLUTTER_LESSONS[0];
    if (l.videoIds.length > 0) {
      const ex = await p.progress.findFirst({ where: { lessonId: l.id, studentId: sid } });
      if (!ex) await p.progress.create({ data: { lessonId: l.id, studentId: sid, completed: true, completionStatus: 'COMPLETED', completedAt: ago(6), completedItems: l.videoIds } });
    }
  }

  console.log('\n✅ All remaining students filled with data!');
}

main().catch(console.error).finally(() => p.$disconnect());
