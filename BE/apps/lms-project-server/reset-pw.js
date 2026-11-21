const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function resetAdminPassword() {
    const prisma = new PrismaClient();
    try {
        const admins = await prisma.user.findMany({
            where: { roles: { has: "ADMIN" } }
        });
        if (admins.length > 0) {
            const admin = admins[0];
            const hash = await bcrypt.hash("123456", 10);
            await prisma.user.update({
                where: { id: admin.id },
                data: { password: hash }
            });
            console.log("Admin password reset. Username is:", admin.username);
        } else {
            console.log("No admin found!");
        }
    } catch(e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

resetAdminPassword();
