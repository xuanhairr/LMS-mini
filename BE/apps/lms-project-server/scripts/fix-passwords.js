const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
    console.log('Checking for unhashed passwords...');

    const users = await prisma.user.findMany();
    let count = 0;

    for (const user of users) {
        // Bcrypt hashes start with $2b$ or $2a$ or $2y$ and are 60 chars long
        const isHashed = user.password.startsWith('$2b$') && user.password.length === 60;

        if (!isHashed) {
            console.log(`Hashing password for user: ${user.username}`);
            const hashedPassword = await bcrypt.hash(user.password, 10);
            await prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword },
            });
            count++;
        }
    }

    console.log(`Successfully hashed ${count} password(s).`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
