import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const p = new PrismaClient();

async function hashPwd(pwd: string) {
  return await bcrypt.hash(pwd, 10);
}

async function main() {
  const password = await hashPwd('Abc@12345');
  
  // Create or Update Manager
  await p.user.upsert({
    where: { email: 'giaovu@lms.vn' },
    update: { roles: ['MANAGER'] },
    create: {
      username: 'giaovu',
      email: 'giaovu@lms.vn',
      fullName: 'Giáo vụ Demo',
      password,
      roles: ['MANAGER'],
      status: 'active'
    }
  });

  console.log('Seeded giaovu@lms.vn');
}

main().catch(console.error).finally(() => p.$disconnect());
