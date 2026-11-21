const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSpecificCourse() {
    const courseId = "697d6c0bf17371d138165522";
    const teacherId = "697ae62dfd302924270a1f4b"; // ID from user's CURL

    const updated = await prisma.course.update({
        where: { id: courseId },
        data: { teacherId: teacherId }
    });

    console.log('Updated course:', updated.title, 'with teacherId:', teacherId);
}

fixSpecificCourse()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
