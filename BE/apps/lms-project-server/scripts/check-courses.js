const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCourses() {
    const allCourses = await prisma.course.findMany({
        select: {
            id: true,
            title: true,
            teacherId: true,
        }
    });
    console.log('ALL COURSES IN DB:');
    console.log(JSON.stringify(allCourses, null, 2));
}

checkCourses()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
