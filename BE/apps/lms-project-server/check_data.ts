import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const user = await p.user.findUnique({ where: { email: 'kiennd03@gmail.com' } });
  console.log('USER:', JSON.stringify(user));
  
  const enrollments = await p.enrollment.findMany({ where: { studentId: user?.id }, include: { class: true } });
  console.log('ENROLLMENTS:', JSON.stringify(enrollments));
}

main().catch(console.error).finally(() => p.$disconnect());
