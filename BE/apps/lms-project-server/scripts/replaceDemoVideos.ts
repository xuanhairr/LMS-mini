import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Replacing videos for demo courses with PostgreSQL course videos...');

  // Find the PostgreSQL course
  const pgCourse = await prisma.course.findFirst({
    where: {
      title: {
        contains: 'Nhập môn CSDL - PostgreSQL',
        mode: 'insensitive'
      }
    },
    include: {
      lessons: {
        include: {
          videos: true
        }
      }
    }
  });

  if (!pgCourse) {
    console.log('Could not find PostgreSQL course.');
    return;
  }

  // Extract video links from PG course
  const pgVideos = [];
  for (const lesson of pgCourse.lessons) {
    for (const video of lesson.videos) {
      if (video.url) {
        pgVideos.push({ title: video.title, url: video.url, duration: video.duration });
      }
    }
  }

  if (pgVideos.length === 0) {
    console.log('No videos found in PostgreSQL course.');
    return;
  }

  // Find our demo courses
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

  let videoCount = 0;

  for (const course of courses) {
    for (const lesson of course.lessons) {
      // First delete existing videos in this lesson
      await prisma.video.deleteMany({
        where: { lessonId: lesson.id }
      });

      // Pick 2 random videos from PG course
      const v1 = pgVideos[Math.floor(Math.random() * pgVideos.length)];
      const v2 = pgVideos[Math.floor(Math.random() * pgVideos.length)];

      await prisma.video.createMany({
        data: [
          {
            title: `Phần 1: ${v1.title}`,
            url: v1.url,
            duration: v1.duration || 1200,
            lessonId: lesson.id,
            order: 1
          },
          {
            title: `Phần 2: ${v2.title}`,
            url: v2.url,
            duration: v2.duration || 900,
            lessonId: lesson.id,
            order: 2
          }
        ]
      });
      videoCount += 2;
    }
  }

  console.log(`Successfully replaced ${videoCount} videos using the PostgreSQL course links!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
