const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration of old homework data...');
  
  // Lấy raw collection từ MongoDB vì hwTitle không còn trong Prisma schema
  const db = prisma.$transaction ? await prisma.$runCommandRaw({ ping: 1 }) : null;
  // Dùng prisma raw để find
  const lessons = await prisma.lesson.findRaw({
    filter: {
      $or: [
        { hwTitle: { $exists: true, $ne: null } },
        { hwDescription: { $exists: true, $ne: null } }
      ]
    }
  });

  console.log(`Found ${lessons.length} lessons with old homework data.`);

  let migratedCount = 0;
  for (const lessonRaw of lessons) {
    const lessonId = lessonRaw._id.$oid;
    const hwTitle = lessonRaw.hwTitle;
    const hwDescription = lessonRaw.hwDescription;

    if (!hwTitle && !hwDescription) continue;

    // Kiểm tra xem đã có homework nào tạo cho lesson này chưa
    const existingHw = await prisma.homework.findFirst({
      where: { lessonId }
    });

    if (!existingHw) {
      // Create new homework
      await prisma.homework.create({
        data: {
          lessonId,
          title: hwTitle || 'Bài tập tự luận',
          description: hwDescription || '',
          level: 'Cơ bản', // Default level cho bài cũ
          order: 0
        }
      });
      migratedCount++;
    }
    

  }

  console.log(`Successfully migrated ${migratedCount} homeworks.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
