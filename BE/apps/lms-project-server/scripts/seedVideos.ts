import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const VIDEO_LINKS = [
  'https://www.youtube.com/watch?v=kYxCRzI7CBQ', // React
  'https://www.youtube.com/watch?v=1gDhl4leEzA', // Flutter
  'https://www.youtube.com/watch?v=ENrzD9HAZK4', // Node
  'https://www.youtube.com/watch?v=x7X9w_Gpz1A', // Docker
  'https://www.youtube.com/watch?v=rfscVS0vtbw', // Python
];

async function main() {
  console.log('Seeding videos for demo courses...');

  const courses = await prisma.course.findMany({
    where: {
      title: {
        in: ['Fullstack ReactJS & NodeJS', 'Xây dựng App với Flutter']
      }
    },
    include: {
      lessons: true
    }
  });

  if (courses.length === 0) {
    console.log('No demo courses found.');
    return;
  }

  let videoCount = 0;

  for (const course of courses) {
    for (const lesson of course.lessons) {
      // Pick 2 random videos for each lesson
      const link1 = VIDEO_LINKS[Math.floor(Math.random() * VIDEO_LINKS.length)];
      const link2 = VIDEO_LINKS[Math.floor(Math.random() * VIDEO_LINKS.length)];

      await prisma.video.createMany({
        data: [
          {
            title: `Video bài giảng Phần 1: ${lesson.title}`,
            url: link1,
            duration: 1200 + Math.floor(Math.random() * 600), // ~20-30 mins in seconds
            lessonId: lesson.id,
            order: 1
          },
          {
            title: `Video bài giảng Phần 2: Thực hành`,
            url: link2,
            duration: 900 + Math.floor(Math.random() * 600), // ~15-25 mins
            lessonId: lesson.id,
            order: 2
          }
        ]
      });
      videoCount += 2;
    }
  }

  console.log(`Successfully added ${videoCount} videos to the lessons!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
