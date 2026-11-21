import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10);

  const users = [
    {
      username: 'staff_demo',
      email: 'staff@lms.vn',
      fullName: 'Giáo vụ Demo',
      password: passwordHash,
      roles: ['STAFF'],
      status: 'active',
      forcePasswordChange: false,
      isEmailVerified: true,
    },
    {
      username: 'teacher_demo',
      email: 'gv@lms.vn',
      fullName: 'Giảng viên Demo',
      password: passwordHash,
      roles: ['TEACHER'],
      status: 'active',
      forcePasswordChange: false,
      isEmailVerified: true,
    },
    {
      username: 'student1_demo',
      email: 'hv1@lms.vn',
      fullName: 'Học viên Demo 1',
      password: passwordHash,
      roles: ['STUDENT'],
      status: 'active',
      forcePasswordChange: false,
      isEmailVerified: true,
    },
    {
      username: 'student2_demo',
      email: 'hv2@lms.vn',
      fullName: 'Học viên Demo 2',
      password: passwordHash,
      roles: ['STUDENT'],
      status: 'active',
      forcePasswordChange: false,
      isEmailVerified: true,
    }
  ];

  for (const user of users) {
    try {
      await prisma.user.upsert({
        where: { username: user.username },
        update: { ...user, email: user.email }, // Just update
        create: user,
      });
      console.log(`Created/Updated user: ${user.username} (${user.email})`);
    } catch (e) {
      console.error(`Error creating ${user.username}:`, e);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
