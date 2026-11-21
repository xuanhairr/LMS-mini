const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCourses() {
    console.log('Starting course data fix...');

    // 1. Find all courses without a teacherId
    const coursesWithoutTeacher = await prisma.course.findMany({
        where: {
            teacherId: null,
        },
    });

    console.log(`Found ${coursesWithoutTeacher.length} courses without a teacher.`);

    if (coursesWithoutTeacher.length === 0) {
        console.log('No courses to fix.');
        return;
    }

    // 2. We don't strictly know who created them without audit logs, 
    // but we can try to find a user with TEACHER or ADMIN role to assign them to.
    // For this specific task, we'll ask the user to provide an ID or find the first admin/teacher.
    const defaultTeacher = await prisma.user.findFirst({
        where: {
            roles: {
                has: 'ADMIN',
            },
        },
    });

    if (!defaultTeacher) {
        console.error('Could not find a default teacher/admin to assign courses to.');
        return;
    }

    console.log(`Assigning courses to user: ${defaultTeacher.username} (${defaultTeacher.id})`);

    for (const course of coursesWithoutTeacher) {
        await prisma.course.update({
            where: { id: course.id },
            data: {
                teacherId: defaultTeacher.id,
            },
        });
        console.log(`Updated course: ${course.title} (${course.id})`);
    }

    console.log('Data fix complete.');
}

fixCourses()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
