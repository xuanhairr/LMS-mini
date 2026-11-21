import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const pRecord = await p.progress.findMany({
    where: { 
      student: { email: 'kiennd03@gmail.com' },
      lesson: { title: { contains: 'Build & Deploy' } }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (pRecord.length === 0) return;

  // Keep the first one, delete others
  const [toKeep, ...toDelete] = pRecord;

  if (toDelete.length > 0) {
    const deleteIds = toDelete.map(r => r.id);
    await p.progress.deleteMany({
      where: { id: { in: deleteIds } }
    });
    console.log(`Deleted ${deleteIds.length} duplicate progress records.`);
  }

  // Clear completed items and video progress
  await p.progress.update({
    where: { id: toKeep.id },
    data: {
      completed: false,
      completionStatus: 'IN_PROGRESS',
      completedItems: [],
      videoWatchedSeconds: 0,
      videoDuration: 0,
      completedAt: null,
      firstCompletedAt: null
    }
  });

  console.log('Progress has been fully reset.');
}

main().catch(console.error).finally(() => p.$disconnect());
