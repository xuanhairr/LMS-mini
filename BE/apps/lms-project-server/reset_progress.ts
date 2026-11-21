import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const result = await p.progress.updateMany({
    where: { completed: false },
    data: { videoWatchedSeconds: 0 }
  });

  console.log(`Reset videoWatchedSeconds to 0 for ${result.count} uncompleted progress records.`);
}

main().catch(console.error).finally(() => p.$disconnect());
