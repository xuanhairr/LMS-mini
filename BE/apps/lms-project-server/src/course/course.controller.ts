import * as common from "@nestjs/common";
import * as swagger from "@nestjs/swagger";
import { CourseService } from "./course.service";
import { CourseControllerBase } from "./base/course.controller.base";
import { LessonService } from "../lesson/lesson.service";
import { CourseFindManyArgs } from "./base/CourseFindManyArgs";
import { plainToClass } from "class-transformer";
import { PrismaService } from "../prisma/prisma.service";

import { CourseAccessGuard } from "./CourseAccessGuard";
import { DefaultAuthGuard } from "../auth/defaultAuth.guard";

@swagger.ApiTags("courses")
@common.Controller("courses")
@common.UseGuards(DefaultAuthGuard)
export class CourseController extends CourseControllerBase {
  constructor(
    protected readonly service: CourseService,
    protected readonly lessonService: LessonService,
    protected readonly prisma: PrismaService
  ) {
    super(service);
  }

  @common.Get("/my-courses")
  async getMyCourses(@common.Req() req: any) {
    const userId = req.user.id;
    return this.service.getMyCourses(userId);
  }

  private unflatten(obj: any) {
    const result: any = {};
    for (const i in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, i)) continue;
      const keys = i.split(/[\[\]]+/).filter(Boolean);
      keys.reduce((acc, key, idx) => {
        if (idx === keys.length - 1) {
          acc[key] = obj[i];
        } else {
          acc[key] = acc[key] || {};
        }
        return acc[key];
      }, result);
    }
    return result;
  }

  @common.Post()
  // @ts-ignore
  async createCourse(
    @common.Body() data: any,
    @common.Req() request: any
  ): Promise<any> {
    const user = request.user;
    const roles = user.roles as string[];

    // Only ADMIN, HEAD_STAFF, and TEACHER can create courses
    if (!roles.includes("ADMIN") && !roles.includes("HEAD_STAFF") && !roles.includes("TEACHER")) {
      throw new common.ForbiddenException("Chỉ Giảng viên, Giáo vụ trưởng hoặc Admin mới có quyền tạo khóa học");
    }

    // Auto-link creator as teacher if no teacher provided and user is a TEACHER
    if (!data.teacher && user && user.roles.includes("TEACHER")) {
      data.teacher = { id: user.id };
    }

    return this.service.createCourse({
      data: {
        ...data,
        categoryId: undefined,
        teacher: data.teacher ? { connect: data.teacher } : undefined,
        creator: user?.id ? { connect: { id: user.id } } : undefined,
        category: data.categoryId ? { connect: { id: data.categoryId } } : undefined,
        duration: 0,
        lessonCount: 0,
      },
      select: {
        id: true,
        title: true,
        description: true,
        coverImage: true,
        status: true,
        duration: true,
        lessonCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  @common.Get()
  async courses(@common.Req() request: any): Promise<any[]> {
    const rawQuery = request.query;
    const unflattened = this.unflatten(rawQuery);

    console.log('Original Query:', rawQuery);
    console.log('Unflattened Query:', JSON.stringify(unflattened, null, 2));

    const args = plainToClass(CourseFindManyArgs, unflattened);

    // Filter for students: only show enrolled courses
    const user = request.user;
    if (user && user.roles.includes("STUDENT")) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { studentId: user.id },
        select: { courseId: true, class: { select: { courseId: true } } }
      });
      const courseIds = enrollments.map(e => e.courseId || e.class?.courseId).filter(Boolean) as string[];

      args.where = {
        ...args.where,
        id: { in: courseIds }
      };
    }

    // Filter for teachers: only show assigned courses
    if (user && user.roles.includes("TEACHER")) {
      args.where = {
        ...args.where,
        teacher: { id: user.id }
      };
    }

    const results = await this.service.courses({
      ...args,
      select: {
        id: true,
        title: true,
        description: true,
        coverImage: true,
        status: true,
        duration: true,
        lessonCount: true,
        createdAt: true,
        updatedAt: true,
        teacher: {
          select: {
            id: true,
            username: true,
            fullName: true,
          }
        },
        creator: {
          select: {
            id: true,
            username: true,
            fullName: true,
          }
        },
        updater: {
          select: {
            id: true,
            username: true,
            fullName: true,
          }
        },
        category: true
      },
    });

    // Immediate lazy sync for null metadata
    await Promise.all(
      results.map(async (c: any) => {
        if (c.duration === null || c.lessonCount === null) {
          console.log(`Lazy syncing course ${c.id} during list fetch...`);
          try {
            await this.lessonService.syncCourseMetadata(c.id);
            // Refresh the specific record values after sync
            const updated = await this.service.course({
              where: { id: c.id },
              select: { duration: true, lessonCount: true }
            });
            if (updated) {
              c.duration = updated.duration;
              c.lessonCount = updated.lessonCount;
            }
          } catch (err) {
            console.error(`Failed to lazy sync course ${c.id}:`, err);
          }
        }
      })
    );

    return results;
  }

  @common.Get("/:id")
  @common.UseGuards(CourseAccessGuard)
  // @ts-ignore
  async course(
    @common.Param() params: any,
    @common.Req() request: any
  ): Promise<any> {
    const courseData: any = await this.service.course({
      where: params,
      select: {
        id: true,
        title: true,
        description: true,
        coverImage: true,
        status: true,
        duration: true,
        lessonCount: true,
        createdAt: true,
        updatedAt: true,
        teacher: {
          select: {
            id: true,
            fullName: true,
          }
        },
        category: true,
        lessons: {
          select: {
            id: true,
            title: true,
            content: true,
            duration: true,
            status: true,
            typeField: true,
            order: true,
            sessionNumber: true,
            createdAt: true,
            updatedAt: true,
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
            attachments: {
              select: {
                id: true,
                title: true,
                fileUrl: true,
                fileType: true,
                fileName: true,
                fileSize: true,
                category: true,
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
                },
              },
            },
            homeworks: {
              select: {
                id: true,
                title: true,
                description: true,
                level: true,
                order: true,
              }
            },
          },
        },
      },
    });

    if (!courseData) return null;

    // Sắp xếp danh sách bài học theo thứ tự tăng dần (order / sessionNumber / số thứ tự bài)
    if (Array.isArray(courseData.lessons)) {
      courseData.lessons.sort((a: any, b: any) => {
        if (a.order !== undefined && b.order !== undefined && a.order !== b.order) {
          return a.order - b.order;
        }
        if (a.sessionNumber !== undefined && b.sessionNumber !== undefined && a.sessionNumber !== b.sessionNumber) {
          return (a.sessionNumber || 0) - (b.sessionNumber || 0);
        }
        return (a.title || "").localeCompare(b.title || "", undefined, { numeric: true, sensitivity: "base" });
      });
    }

    // Bảo mật: Ẩn đáp án đúng đối với học viên để chống F12 gian lận
    const user = request.user;
    const roles: string[] = user?.roles || [];
    const isStudent = roles.includes("STUDENT") && !roles.includes("ADMIN") && !roles.includes("HEAD_STAFF") && !roles.includes("STAFF") && !roles.includes("TEACHER");

    if (isStudent && Array.isArray(courseData.lessons)) {
      courseData.lessons.forEach((lesson: any) => {
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

    return courseData;
  }

  @common.Patch("/:id")
  @common.UseGuards(CourseAccessGuard)
  // @ts-ignore
  async updateCourse(
    @common.Param() params: any,
    @common.Body() data: any,
    @common.Req() request: any
  ): Promise<any> {
    const user = request.user;
    const roles = user.roles as string[];

    // Only ADMIN and HEAD_STAFF can change the course teacher
    if (data.teacher && !roles.includes("ADMIN") && !roles.includes("HEAD_STAFF")) {
      delete data.teacher;
    }

    return this.service.updateCourse({
      where: params,
      data: {
        ...data,
        categoryId: undefined,
        teacher: data.teacher ? { connect: data.teacher } : undefined,
        creator: data.creator ? { connect: data.creator } : undefined,
        updater: { connect: { id: request.user.id } },
        category: data.categoryId ? { connect: { id: data.categoryId } } : data.categoryId === null ? { disconnect: true } : undefined,
      },
      select: {
        id: true,
        status: true,
      },
    });
  }

  @common.Delete("/:id")
  @common.UseGuards(CourseAccessGuard)
  // @ts-ignore
  async deleteCourse(@common.Param() params: any, @common.Req() request: any): Promise<any> {
    const user = request.user;
    const roles = user.roles as string[];

    // Only ADMIN, HEAD_STAFF and TEACHER can delete courses
    if (!roles.includes("ADMIN") && !roles.includes("HEAD_STAFF") && !roles.includes("TEACHER")) {
      throw new common.ForbiddenException("Chỉ Quản trị viên, Giáo vụ trưởng hoặc Giảng viên mới có quyền xóa khóa học");
    }

    return this.service.deleteCourse({
      where: params,
      select: { id: true },
    });
  }

  @common.Get("/:id/lessons")
  @common.UseGuards(CourseAccessGuard)
  async findLessons(
    @common.Req() request: any,
    @common.Param() params: any
  ): Promise<any[]> {
    const lessons = await this.service.findLessons(params.id, {
      select: {
        id: true,
        title: true,
        content: true,
        duration: true,
        status: true,
        typeField: true,
        createdAt: true,
        updatedAt: true,
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
        attachments: {
          select: {
            id: true,
            title: true,
            fileUrl: true,
            fileType: true,
            fileName: true,
            fileSize: true,
            category: true,
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
    });

    // Bảo mật: Ẩn đáp án đúng đối với học viên để chống F12 gian lận
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

  @common.Post("/:id/clone")
  @common.UseGuards(CourseAccessGuard)
  async cloneCourse(
    @common.Param("id") id: string,
    @common.Req() request: any
  ): Promise<any> {
    // 1. Fetch full course data
    const originalCourse = await this.service.course({
      where: { id },
      select: {
        title: true,
        description: true,
        coverImage: true,
        status: true,
        lessons: {
          include: {
            videos: true,
            quizzes: {
              include: {
                questions: true,
              },
            },
            homeworks: true,
          },
        },
      },
    }) as any;

    if (!originalCourse) {
      throw new common.NotFoundException("Không tìm thấy khóa học gốc");
    }

    // 2. Create new cloned course
    const clonedCourse = await this.service.createCourse({
      data: {
        title: `${originalCourse.title} (Bản sao)`,
        description: originalCourse.description,
        coverImage: originalCourse.coverImage,
        status: "draft",
        duration: 0,
        lessonCount: 0,
        teacher: { connect: { id: request.user.id } },
        creator: { connect: { id: request.user.id } },
      },
      select: { id: true },
    });

    // 3. Deep clone lessons, videos, and quizzes
    for (const lesson of (originalCourse.lessons || [])) {
      const clonedLesson = await this.lessonService.createLesson({
        data: {
          title: lesson.title,
          content: lesson.content,
          typeField: lesson.typeField,
          status: lesson.status,
          duration: lesson.duration,
          course: { connect: { id: clonedCourse.id } },
        },
        select: { id: true },
      });

      // Clone videos
      for (const video of (lesson.videos || [])) {
        await this.prisma.video.create({
          data: {
            title: video.title,
            url: video.url,
            duration: video.duration,
            lesson: { connect: { id: clonedLesson.id } },
          },
        });
      }

      // Clone quizzes
      for (const quiz of (lesson.quizzes || [])) {
        const clonedQuiz = await this.prisma.quiz.create({
          data: {
            title: quiz.title,
            lesson: { connect: { id: clonedLesson.id } },
          },
        });

        // Clone questions
        for (const question of (quiz.questions || [])) {
          await this.prisma.question.create({
            data: {
              content: question.content,
              options: question.options,
              correctAnswer: question.correctAnswer,
              quiz: { connect: { id: clonedQuiz.id } },
            },
          });
        }
      }
    }

    // 4. Final sync of metadata for the new course
    await this.lessonService.syncCourseMetadata(clonedCourse.id);

    return { id: clonedCourse.id, message: "Nhân bản khóa học thành công" };
  }
}
