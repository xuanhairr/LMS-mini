import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const students = await p.user.findMany({
    where: { roles: { has: 'STUDENT' } },
    select: { email: true, fullName: true, status: true }
  });

  console.log(JSON.stringify(students, null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());
