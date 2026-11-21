import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CourseServiceBase } from "./base/course.service.base";
import { Course, Prisma } from "@prisma/client";

@Injectable()
export class CourseService extends CourseServiceBase {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  async courses<T extends Prisma.CourseFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.CourseFindManyArgs>
  ): Promise<Course[]> {
    const { select, ...restArgs } = args as any;

    // Force include _count if select is present, otherwise standard include
    const queryArgs: any = {
      ...restArgs,
    };

    if (select) {
      // If select is present, we must remove 'lessonCount' from it because it's calculated
      const { lessonCount, ...restSelect } = select as any;
      queryArgs.select = {
        ...restSelect,
        _count: {
          select: { lessons: true },
        },
      };

      // If only lessonCount was selected, ensure we select id or something to keep object valid
      if (Object.keys(restSelect).length === 0) {
        queryArgs.select.id = true;
      }
    } else {
      queryArgs.include = {
        ...(args.include as any),
        _count: {
          select: { lessons: true },
        },
      };
    }

    const results = await this.prisma.course.findMany(queryArgs);

    return results.map((course: any) => ({
      ...course,
      lessonCount: course._count?.lessons ?? course.lessonCount ?? 0,
    })) as unknown as Course[];
  }

  async findLessons(
    parentId: string,
    args: Prisma.LessonFindManyArgs
  ): Promise<any[]> {
    return this.prisma.lesson.findMany({
      ...args,
      where: {
        ...args.where,
        course: { id: parentId }
      }
    });
  }

  async getMyCourses(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: userId },
      distinct: ['courseId'],
      include: { 
        course: {
          include: {
            lessons: true
          }
        } 
      }
    });

    const progresses = await this.prisma.progress.findMany({
      where: { studentId: userId, completed: true }
    });

    return enrollments.map(e => {
      const course = e.course;
      if (!course) return null;

      const totalLessons = course.lessons.length;
      
      // Lấy danh sách lessonId duy nhất đã hoàn thành trong khóa học này
      const uniqueCompletedLessonIds = new Set(
        progresses
          .filter(p => course.lessons.some(l => l.id === p.lessonId))
          .map(p => p.lessonId)
      );
      const completedLessons = uniqueCompletedLessonIds.size;

      const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      return {
        id: course.id,
        title: course.title,
        coverImage: course.coverImage,
        totalLessons: totalLessons,
        completedLessons: completedLessons,
        progress: progressPercent
      };
    }).filter(Boolean);
  }
}
