import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const email = 'kiennd03@gmail.com';
  const student = await p.user.findUnique({ where: { email } });
  if (!student) throw new Error('Student not found');

  const course = await p.course.findFirst({
    where: { title: { contains: 'Flutter' } },
    include: {
      lessons: {
        orderBy: { order: 'desc' },
        take: 1,
        include: {
          videos: true
        }
      }
    }
  });

  if (!course || course.lessons.length === 0) throw new Error('Course or lesson not found');

  const lastLesson = course.lessons[0];
  console.log(`Processing lesson: ${lastLesson.title}`);

  const videos = lastLesson.videos;
  if (videos.length >= 2) {
    // Update titles for the first two videos
    await p.video.update({
      where: { id: videos[0].id },
      data: { title: 'Phần 1: Chuẩn bị build ứng dụng Flutter' }
    });
    console.log('Updated video 1 title');

    await p.video.update({
      where: { id: videos[1].id },
      data: { title: 'Phần 2: Triển khai App lên Google Play & App Store' }
    });
    console.log('Updated video 2 title');
  } else if (videos.length === 1) {
    await p.video.update({
      where: { id: videos[0].id },
      data: { title: 'Phần 1: Hướng dẫn Build & Deploy Flutter App' }
    });
    console.log('Updated video 1 title');
  }

  // Find progress
  const progress = await p.progress.findFirst({
    where: {
      studentId: student.id,
      lessonId: lastLesson.id
    }
  });

  if (progress) {
    // Remove video IDs from completedItems
    const videoIdsToRemove = videos.map(v => v.id);
    const newCompletedItems = progress.completedItems.filter(id => !videoIdsToRemove.includes(id));
    
    await p.progress.update({
      where: { id: progress.id },
      data: {
        completed: false,
        completionStatus: 'IN_PROGRESS',
        completedItems: newCompletedItems,
        videoWatchedSeconds: 0
      }
    });
    console.log('Progress updated: Removed videos from completedItems and reset videoWatchedSeconds.');
  }

}

main().catch(console.error).finally(() => p.$disconnect());
