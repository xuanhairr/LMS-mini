import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const staff = await p.user.findMany({
    where: { 
      OR: [
        { roles: { has: 'TEACHER' } },
        { roles: { has: 'MANAGER' } },
        { roles: { has: 'ADMIN' } }
      ]
    },
    select: { email: true, fullName: true, roles: true, status: true }
  });

  console.log(JSON.stringify(staff, null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());
