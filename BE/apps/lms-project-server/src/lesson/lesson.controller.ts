import * as common from "@nestjs/common";
import * as swagger from "@nestjs/swagger";
import { LessonService } from "./lesson.service";
import { LessonControllerBase } from "./base/lesson.controller.base";
import { DefaultAuthGuard } from "../auth/defaultAuth.guard";
import { Lesson } from "./base/Lesson";

import { PrismaService } from "../prisma/prisma.service";

@swagger.ApiTags("lessons")
@common.Controller("lessons")
export class LessonController extends LessonControllerBase {
  constructor(
    protected readonly service: LessonService,
    private readonly prisma: PrismaService
  ) {
    super(service);
  }

  @common.Post("/:id/homeworks")
  @common.UseGuards(DefaultAuthGuard)
  async syncHomeworks(
    @common.Param("id") id: string,
    @common.Body() data: any[]
  ) {
    // Xóa tất cả homework cũ TRỪ NHỮNG homework có id nằm trong data
    const newHwIds = data.map((hw: any) => hw.id).filter(Boolean);
    await this.prisma.homework.deleteMany({
      where: { lessonId: id, id: { notIn: newHwIds } }
    });

    // Cập nhật hoặc tạo mới
    for (const hw of data) {
      if (hw.id) {
        await this.prisma.homework.update({
          where: { id: hw.id },
          data: {
            title: hw.title,
            description: hw.description,
            level: hw.level,
            order: hw.order || 0
          }
        });
      } else {
        await this.prisma.homework.create({
          data: {
            lessonId: id,
            title: hw.title,
            description: hw.description,
            level: hw.level,
            order: hw.order || 0
          }
        });
      }
    }
    return { success: true };
  }

  @common.Post()
  @common.UseGuards(DefaultAuthGuard)
  // @ts-ignore
  async createLesson(@common.Body() data: any, @common.Req() request: any): Promise<any> {
    return this.service.createLesson({
      data: {
        ...data,
        course: data.course ? { connect: data.course } : undefined,
      },
      select: {
        id: true,
        title: true,
        content: true,
        duration: true,
        status: true,
        courseId: true,
        videos: {
          select: {
            id: true,
            title: true,
            url: true,
            duration: true,
            createdAt: true,
            updatedAt: true,
          }
        },
        quizzes: {
          select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true,
            questions: {
              select: {
                id: true,
                content: true,
                options: true,
                correctAnswer: true,
                createdAt: true,
                updatedAt: true,
              }
            }
          }
        },
        homeworks: {
          select: {
            id: true,
            title: true,
            description: true,
            level: true,
            order: true,
          }
        }
      }
    }, request.user?.id);
  }

  @common.Patch("/:id")
  @common.UseGuards(DefaultAuthGuard)
  // @ts-ignore
  async updateLesson(
    @common.Param() params: any,
    @common.Body() data: any,
    @common.Req() request: any
  ): Promise<any> {
    // Fix Prisma nested operations execution order bug (create before deleteMany issue)
    if (data.videos && data.videos.deleteMany && data.videos.create) {
      const { deleteMany, create, ...rest } = data.videos;
      data.videos = { deleteMany, create, ...rest };
    }
    if (data.quizzes && data.quizzes.deleteMany && data.quizzes.create) {
      const { deleteMany, create, ...rest } = data.quizzes;
      data.quizzes = { deleteMany, create, ...rest };
    }

    return this.service.updateLesson({
      where: params,
      data: {
        ...data,
        course: data.course ? { connect: data.course } : undefined,
      },
      select: {
        id: true,
        title: true,
        content: true,
        duration: true,
        status: true,
        courseId: true,
        videos: {
          select: {
            id: true,
            title: true,
            url: true,
            duration: true,
            createdAt: true,
            updatedAt: true,
          }
        },
        quizzes: {
          select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true,
            questions: {
              select: {
                id: true,
                content: true,
                options: true,
                correctAnswer: true,
                createdAt: true,
                updatedAt: true,
              }
            }
          }
        },
        homeworks: {
          select: {
            id: true,
            title: true,
            description: true,
            level: true,
            order: true,
          }
        }
      }
    }, request.user?.id);
  }

  @common.Get()
  @swagger.ApiOkResponse({ type: [Lesson] })
  async getLessons(@common.Req() request: any): Promise<any[]> {
    const { courseId, sortBy, sortOrder, ...restQuery } = request.query;
    
    const args: any = {
      where: {},
      select: {
        id: true,
        title: true,
        content: true,
        duration: true,
        status: true,
        courseId: true,
        order: true,
        videos: {
          select: { id: true, title: true, url: true, duration: true }
        },
        quizzes: {
          select: {
            id: true, title: true,
            questions: { select: { id: true, content: true, options: true, correctAnswer: true } }
          }
        },
        homeworks: {
          select: { id: true, title: true, description: true, level: true, order: true },
          orderBy: { order: 'asc' }
        }
      }
    };
    
    if (courseId) {
      args.where.courseId = courseId;
    }
    
    if (sortBy) {
      args.orderBy = { [sortBy]: sortOrder || 'asc' };
    }

    const lessons = await this.prisma.lesson.findMany(args);

    const user = request.user;
    const roles: string[] = user?.roles || [];
    const isStudent = roles.includes("STUDENT") && !roles.includes("ADMIN") && !roles.includes("HEAD_STAFF") && !roles.includes("STAFF") && !roles.includes("TEACHER");

    if (isStudent && Array.isArray(lessons)) {
      lessons.forEach((lesson: any) => {
        if (Array.isArray(lesson.quizzes)) {
          lesson.quizzes.forEach((quiz: any) => {
            if (Array.isArray(quiz.questions)) {
              quiz.questions.forEach((q: any) => {
                delete q.correctAnswer;
              });
            }
          });
        }
      });
    }

    return lessons;
  }
}
