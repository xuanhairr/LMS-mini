import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 BẮT ĐẦU CHẠY ÉP TIẾN TRÌNH (FORCE RUN CRON JOBS) 🚀\n');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log('1️⃣ TIẾN TRÌNH: TỰ ĐỘNG KHAI GIẢNG (Ready -> Active)');
  const readyToActive = await prisma.class.updateMany({
    where: {
      status: 'ready',
      startDate: { lte: today },
    },
    data: { status: 'active' },
  });
  console.log(`✅ Đã chuyển ${readyToActive.count} lớp sang trạng thái "Đang diễn ra".\n`);

  console.log('2️⃣ TIẾN TRÌNH: TỰ ĐỘNG BẾ GIẢNG (Active -> Finished)');
  const finishThresholdDate = new Date(today);
  finishThresholdDate.setDate(finishThresholdDate.getDate() - 2);

  const activeToFinished = await prisma.class.updateMany({
    where: {
      status: 'active',
      endDate: { lt: finishThresholdDate },
    },
    data: { status: 'finished' },
  });
  console.log(`✅ Đã chuyển ${activeToFinished.count} lớp sang trạng thái "Đã kết thúc".\n`);

  console.log('3️⃣ TIẾN TRÌNH: ĐÁNH DẤU BÀI TẬP QUÁ HẠN (Missing Progress)');
  const now = new Date();
  let missingCount = 0;

  const activeClasses = await prisma.class.findMany({
    where: { enrollments: { some: { status: 'active' } } },
    include: {
      schedule: true,
      course: { include: { lessons: { orderBy: { order: 'asc' } } } },
      enrollments: { where: { status: 'active' } },
    },
  });

  for (const cls of activeClasses) {
    if (!cls.startDate || !cls.schedule?.dayOfWeek) continue;

    const dates: Date[] = [];
    const start = new Date(cls.startDate);
    const jsDays = cls.schedule.dayOfWeek.map((d: number) => (d === 8 ? 0 : d - 1));
    
    let current = new Date(start);
    while (dates.length < 50) {
      if (jsDays.includes(current.getDay())) dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    for (const lesson of cls.course?.lessons || []) {
      const targetSessionIndex = (lesson.order || 0) + 1;
      if (!dates[targetSessionIndex]) continue;

      const deadline = new Date(dates[targetSessionIndex]);
      if (cls.schedule.startTime) {
        const [h, m] = cls.schedule.startTime.split(':').map(Number);
        deadline.setHours(h, m, 0, 0);
      }
      deadline.setHours(deadline.getHours() - 12);

      // Nếu đã qua hạn
      if (deadline < now) {
        for (const enrollment of cls.enrollments) {
          if (!enrollment.studentId) continue;

          const existing = await prisma.progress.findFirst({
            where: { studentId: enrollment.studentId, lessonId: lesson.id },
          });

          if (!existing) {
            await prisma.progress.create({
              data: {
                studentId: enrollment.studentId,
                lessonId: lesson.id,
                completed: false,
                completionStatus: 'MISSING',
              },
            });
            missingCount++;
          } else if (existing.completionStatus === 'PENDING') {
            await prisma.progress.update({
              where: { id: existing.id },
              data: { completionStatus: 'MISSING' },
            });
            missingCount++;
          }
        }
      }
    }
  }
  console.log(`✅ Đã đánh dấu "MISSING" (Quá hạn/Bỏ lỡ) cho ${missingCount} bản ghi học tập.\n`);

  console.log('🎉 ĐÃ HOÀN TẤT DEMO CÁC TIẾN TRÌNH 🎉');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
