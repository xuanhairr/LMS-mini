import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    const users = await prisma.user.findMany({
        where: { fullName: { contains: 'Trung', mode: 'insensitive' } }
    });
    console.log(users.map(x => ({ id: x.id, name: x.fullName, username: x.username, roles: x.roles })));
    await prisma.$disconnect();
}
run();
