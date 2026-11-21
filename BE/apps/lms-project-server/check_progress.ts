import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const pRecord = await p.progress.findMany({
    where: { student: { email: 'kiennd03@gmail.com' } },
    include: { lesson: true }
  });

  const target = pRecord.filter(r => r.lesson?.title?.includes('Build'));
  console.log(JSON.stringify(target, null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());
