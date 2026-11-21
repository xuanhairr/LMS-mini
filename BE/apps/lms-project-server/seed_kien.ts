import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const sid = '6a0991688f9692a91aebcef8'; // kiennd03@gmail.com

const CLASSES = {
  reactK02:   { id: '6a357263b18f34c982a37d95', courseId: '6a27b0722cc1672ac4201c49' },
  flutterK03: { id: '6a357263b18f34c982a37d99', courseId: '6a27b0722cc1672ac4201c4f' },
};

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

function ago(days: number) { const d = new Date(); d.setDate(d.getDate() - days); return d; }

async function main() {
  // Ghi danh vào REACT-K02 và FLUTTER-K03
  await p.enrollment.create({ data: { studentId: sid, classId: CLASSES.reactK02.id, courseId: CLASSES.reactK02.courseId, status: 'active' } });
  await p.enrollment.create({ data: { studentId: sid, classId: CLASSES.flutterK03.id, courseId: CLASSES.flutterK03.courseId, status: 'active' } });
  console.log('Enrolled in REACT-K02 and FLUTTER-K03');

  // REACT-K02: Hoàn thành đầy đủ - đủ ĐK thi (giống Case A)
  for (let sess = 1; sess <= 5; sess++) {
    await p.attendance.create({ data: { classId: CLASSES.reactK02.id, studentId: sid, sessionNumber: sess, date: ago(20 - sess * 3), status: 'present' } });
  }
  for (const l of REACT_LESSONS) {
    for (const qid of l.quizIds) {
      await p.quizAttempt.create({ data: { quizId: qid, studentId: sid, score: 9.5, totalCorrect: 10, passed: true, answers: [] } });
    }
    if (l.videoIds.length > 0) {
      await p.progress.create({ data: { lessonId: l.id, studentId: sid, completed: true, completionStatus: 'COMPLETED', completedAt: ago(15), completedItems: l.videoIds } });
    }
  }
  console.log('REACT-K02: full completion done');

  // FLUTTER-K03: Đang học nửa chừng (2/3 bài)
  for (let sess = 1; sess <= 2; sess++) {
    await p.attendance.create({ data: { classId: CLASSES.flutterK03.id, studentId: sid, sessionNumber: sess, date: ago(8 - sess * 3), status: 'present' } });
  }
  // Xem video bài 1, làm quiz bài 2
  await p.progress.create({ data: { lessonId: FLUTTER_LESSONS[0].id, studentId: sid, completed: true, completionStatus: 'COMPLETED', completedAt: ago(6), completedItems: FLUTTER_LESSONS[0].videoIds } });
  await p.quizAttempt.create({ data: { quizId: FLUTTER_LESSONS[1].quizIds[0], studentId: sid, score: 8.0, totalCorrect: 8, passed: true, answers: [] } });
  await p.progress.create({ data: { lessonId: FLUTTER_LESSONS[1].id, studentId: sid, completed: true, completionStatus: 'COMPLETED', completedAt: ago(4), completedItems: FLUTTER_LESSONS[1].videoIds } });
  console.log('FLUTTER-K03: mid-progress done');

  console.log('\n✅ kiennd03@gmail.com has been enrolled and has data in 2 classes!');
}

main().catch(console.error).finally(() => p.$disconnect());
