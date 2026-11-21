import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LessonServiceBase } from "./base/lesson.service.base";

@Injectable()
export class LessonService extends LessonServiceBase {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  async createLesson(args: any, updaterId?: string): Promise<any> {
    if (args.data?.homeworks && Array.isArray(args.data.homeworks)) {
      delete args.data.homeworks;
    }
    const lesson = await super.createLesson(args);
    if (lesson.courseId) {
      await this.syncCourseMetadata(lesson.courseId, updaterId);
    }
    return lesson;
  }

  async updateLesson(args: any, updaterId?: string): Promise<any> {
    const lessonId = args.where?.id;
    if (lessonId) {
      // Handle Quizzes manually to preserve Quiz ID and QuizAttempts (avoid P2014 and data loss)
      if (args.data?.quizzes) {
        const newQuizzes = args.data.quizzes.create;
        const existingQuizzes = await this.prisma.quiz.findMany({ where: { lessonId } });
        
        if (newQuizzes && newQuizzes.length > 0) {
          const newQuizData = newQuizzes[0];
          
          if (existingQuizzes.length > 0) {
            const existingQuiz = existingQuizzes[0];
            // Update quiz title
            await this.prisma.quiz.update({
              where: { id: existingQuiz.id },
              data: { title: newQuizData.title }
            });
            // Delete old questions
            await this.prisma.question.deleteMany({ where: { quizId: existingQuiz.id } });
            // Insert new questions
            if (newQuizData.questions?.create) {
               for (let i = 0; i < newQuizData.questions.create.length; i++) {
                 const q = newQuizData.questions.create[i];
                 await this.prisma.question.create({
                   data: { content: q.content, options: q.options, correctAnswer: q.correctAnswer, quizId: existingQuiz.id, order: i }
                 });
               }
            }
          } else {
             // No existing quiz, create one
             const createdQuiz = await this.prisma.quiz.create({
               data: { title: newQuizData.title, lessonId: lessonId }
             });
             if (newQuizData.questions?.create) {
               for (let i = 0; i < newQuizData.questions.create.length; i++) {
                 const q = newQuizData.questions.create[i];
                 await this.prisma.question.create({
                   data: { content: q.content, options: q.options, correctAnswer: q.correctAnswer, quizId: createdQuiz.id, order: i }
                 });
               }
             }
          }
        } else if (args.data.quizzes.deleteMany) {
          // Actually delete all quizzes and their attempts/questions
          for (const q of existingQuizzes) {
            await this.prisma.question.deleteMany({ where: { quizId: q.id } });
            await this.prisma.quizAttempt.deleteMany({ where: { quizId: q.id } });
          }
          await this.prisma.quiz.deleteMany({ where: { lessonId } });
        }
        
        // Remove quizzes from args so Prisma doesn't process it natively
        delete args.data.quizzes;
      }

      // Handle Videos manually (Videos don't have dependents, so delete-and-recreate is safe)
      if (args.data?.videos) {
        if (args.data.videos.deleteMany) {
          await this.prisma.video.deleteMany({ where: { lessonId } });
        }
        if (args.data.videos.create && args.data.videos.create.length > 0) {
          for (let i = 0; i < args.data.videos.create.length; i++) {
            const v = args.data.videos.create[i];
            await this.prisma.video.create({
              data: { url: v.url, title: v.title, duration: v.duration, lessonId: lessonId, order: i }
            });
          }
        }
        // Remove videos from args
        delete args.data.videos;
      }
      
      // Also protect against raw homeworks array being passed from FE
      if (args.data?.homeworks && Array.isArray(args.data.homeworks)) {
        delete args.data.homeworks;
      }
    }

    const lesson = await super.updateLesson(args);
    if (lesson.courseId) {
      await this.syncCourseMetadata(lesson.courseId, updaterId);
    }
    return lesson;
  }

  async deleteLesson(args: any, updaterId?: string): Promise<any> {
    const lesson = await super.deleteLesson(args);
    if (lesson.courseId) {
      await this.syncCourseMetadata(lesson.courseId, updaterId);
    }
    return lesson;
  }

  public async syncCourseMetadata(courseId: string, updaterId?: string) {
    const lessons = await this.prisma.lesson.findMany({
      where: { courseId },
      include: {
        videos: true,
      },
    });

    const totalDuration = lessons.reduce((acc, lesson) => {
      const videoSum = (lesson.videos || []).reduce((vAcc, video) => {
        const d = video.duration || 0;
        return vAcc + d;
      }, 0);

      const lessonDur = lesson.duration || videoSum || 0;
      console.log(`- Lesson ${lesson.id}: duration=${lesson.duration}, videoSum=${videoSum} -> using ${lessonDur}`);
      return acc + lessonDur;
    }, 0);

    console.log(`Final calculated Course ${courseId} duration: ${totalDuration}s`);

    const updateData: any = {
      duration: totalDuration,
      lessonCount: lessons.length,
    };

    if (updaterId) {
      updateData.updater = { connect: { id: updaterId } };
    }

    const updatedCourse = await this.prisma.course.update({
      where: { id: courseId },
      data: updateData,
    });

    console.log(`Database updated successfully for Course ${courseId}. New duration in DB: ${updatedCourse.duration}`);
  }
}
