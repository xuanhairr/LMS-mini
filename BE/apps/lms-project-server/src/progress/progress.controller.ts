import * as common from "@nestjs/common";
import * as swagger from "@nestjs/swagger";
import { ProgressService } from "./progress.service";
import { ProgressControllerBase } from "./base/progress.controller.base";
import { Request } from "express";
import { plainToClass } from "class-transformer";
import { ProgressFindManyArgs } from "./base/ProgressFindManyArgs";
import { ApiNestedQuery } from "../decorators/api-nested-query.decorator";
import { DefaultAuthGuard } from "../auth/defaultAuth.guard";
import { PrismaService } from "../prisma/prisma.service";

@swagger.ApiTags("progresses")
@common.Controller("progresses")
export class ProgressController extends ProgressControllerBase {
  constructor(
    protected readonly service: ProgressService,
    protected readonly prisma: PrismaService,
  ) {
    super(service);
  }

  /**
   * Lấy tiến độ học tập theo studentId + courseId (endpoint chuyên dụng, tránh dùng nested filter không hỗ trợ)
   * GET /progresses/by-course?studentId=...&courseId=...
   */
  @common.Get("by-course")
  @common.UseGuards(DefaultAuthGuard)
  async progressesByCourse(
    @common.Query("studentId") studentId: string,
    @common.Query("courseId") courseId: string,
  ): Promise<any> {
    if (!studentId || !courseId) {
      throw new common.BadRequestException("studentId và courseId là bắt buộc");
    }
    return this.prisma.progress.findMany({
      where: {
        studentId,
        lesson: {
          courseId,
        },
      },
      select: {
        id: true,
        completed: true,
        completedAt: true,
        firstCompletedAt: true,
        completionStatus: true,
        videoWatchedSeconds: true,
        videoDuration: true,
        completedItems: true,
        createdAt: true,
        lesson: {
          select: {
            id: true,
            courseId: true,
          },
        },
        student: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  @common.Get()
  @ApiNestedQuery(ProgressFindManyArgs)
  async progresses(@common.Req() request: Request): Promise<any> {
    const args = plainToClass(ProgressFindManyArgs, request.query);
    return this.service.progresses({
      ...args,
      select: {
        completed: true,
        completedAt: true,
        firstCompletedAt: true,
        completionStatus: true,
        createdAt: true,
        id: true,
        lesson: {
          select: {
            id: true,
            courseId: true,
          },
        },
        student: {
          select: {
            id: true,
          },
        },
        updatedAt: true,
      },
    });
  }

  /**
   * Lưu tiến độ xem video (maxWatched và duration)
   * Tự động đánh dấu hoàn thành nếu đã xem ≥ 90%
   */
  @common.Patch("/:id/video-progress")
  @common.UseGuards(DefaultAuthGuard)
  async updateVideoProgress(
    @common.Param("id") id: string,
    @common.Body() body: { watchedSeconds: number; duration: number },
  ): Promise<any> {
    const existing = await this.prisma.progress.findUnique({ where: { id }, include: { lesson: true } });
    if (!existing) throw new common.NotFoundException("Progress không tồn tại");

    const { watchedSeconds, duration } = body;
    const watchRatio = duration > 0 ? watchedSeconds / duration : 0;
    const now = new Date();
    let updateData: any = {
      videoWatchedSeconds: watchedSeconds,
      videoDuration: duration,
    };

    return this.prisma.progress.update({ where: { id }, data: updateData });
  }

  /**
   * Đánh dấu hoàn thành một item cụ thể (video, tài liệu, quiz) trong lesson
   */
  @common.Patch("/:id/complete-item")
  @common.UseGuards(DefaultAuthGuard)
  async completeItem(
    @common.Param("id") id: string,
    @common.Body("itemId") itemId: string,
    @common.Body("isLessonCompleted") isLessonCompleted: boolean
  ): Promise<any> {
    const progress = await this.prisma.progress.findUnique({ where: { id } });
    if (!progress) throw new common.NotFoundException("Progress not found");
    
    // @ts-ignore
    let updatedItems = progress.completedItems || [];
    if (!updatedItems.includes(itemId)) {
      updatedItems.push(itemId);
    }
    
    let updateData: any = {
      // @ts-ignore
      completedItems: updatedItems,
      completed: progress.completed // default to existing
    };

    if (isLessonCompleted && !progress.completed) {
      const now = new Date();
      updateData.completed = true;
      updateData.completedAt = now;
      updateData.firstCompletedAt = progress.firstCompletedAt ?? now;
      const deadline = await this.getDeadlineForLesson(progress.lessonId, progress.studentId);
      updateData.completionStatus = (!deadline || now <= deadline) ? 'COMPLETED' : 'LATE';
    }

    return this.prisma.progress.update({
      where: { id },
      data: updateData
    });
  }

  /**
   * Override: khi học sinh bấm hoàn thành bài học,
   * tự động tính completionStatus dựa trên SessionAssignment deadline
   */
  @common.Patch("/:id")
  @common.UseGuards(DefaultAuthGuard)
  // @ts-ignore
  async updateProgress(
    @common.Param("id") id: string,
    @common.Body() data: any,
    @common.Req() req: any,
  ): Promise<any> {
    const existing = await this.prisma.progress.findUnique({
      where: { id },
      include: { lesson: true },
    });
    if (!existing) throw new common.NotFoundException("Progress không tồn tại");

    const now = new Date();

    // Chỉ tính lần đầu hoàn thành
    let firstCompletedAt = existing.firstCompletedAt;
    if (data.completed && !firstCompletedAt) {
      firstCompletedAt = now;
    }

    let completionStatus = existing.completionStatus;
    if (data.completed && (existing.completionStatus === "PENDING" || existing.completionStatus === "MISSING")) {
      const deadline = await this.getDeadlineForLesson(existing.lessonId, existing.studentId);
      if (deadline) {
        completionStatus = now <= deadline ? "COMPLETED" : "LATE";
      } else {
        completionStatus = "COMPLETED";
      }
    }

    return this.prisma.progress.update({
      where: { id },
      data: {
        ...data,
        completedAt: data.completed ? now : existing.completedAt,
        firstCompletedAt: firstCompletedAt ?? existing.firstCompletedAt,
        completionStatus,
      },
    });
  }

  /**
   * Override: khi tạo progress mới (bắt đầu học)
   */
  @common.Post()
  @common.UseGuards(DefaultAuthGuard)
  // @ts-ignore
  async createProgress(
    @common.Body() data: any,
    @common.Req() req: any,
  ): Promise<any> {
    const now = new Date();
    const completed = data.completed ?? false;

    let completionStatus = "PENDING";
    let firstCompletedAt: Date | null = null;

    const studentId = data.student?.connect?.id || data.student?.id || data.studentId;
    const lessonId = data.lesson?.connect?.id || data.lesson?.id || data.lessonId;

    if (completed) {
      firstCompletedAt = now;
      const deadline = await this.getDeadlineForLesson(lessonId, studentId);
      if (deadline) {
        completionStatus = now <= deadline ? "COMPLETED" : "LATE";
      } else {
        completionStatus = "COMPLETED";
      }
    }

    return this.prisma.progress.create({
      data: {
        lesson: lessonId ? { connect: { id: lessonId } } : undefined,
        student: studentId ? { connect: { id: studentId } } : undefined,
        completed,
        completedAt: completed ? now : null,
        firstCompletedAt,
        completionStatus,
      },
    });
  }

  /** Tìm deadline của bài học dựa vào SessionAssignment của lớp học viên */
  private async getDeadlineForLesson(
    lessonId: string | null | undefined,
    studentId: string | null | undefined,
  ): Promise<Date | null> {
    if (!lessonId || !studentId) return null;
    try {
      // Tìm bài học
      const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
      if (!lesson) return null;
      
      const hwCount = await this.prisma.homework.count({ where: { lessonId } });
      if (hwCount === 0) return null;

      // Tìm lớp học của sinh viên cho khóa học này
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { studentId, class: { courseId: lesson.courseId } },
        include: { class: { include: { schedule: true } } }
      });

      if (!enrollment || !enrollment.class || !enrollment.class.startDate || !enrollment.class.schedule?.dayOfWeek) {
        return null;
      }

      const classInfo = enrollment.class;
      const schedule = classInfo.schedule;
      if (!schedule || !schedule.dayOfWeek) return null;

      const dates: Date[] = [];
      const start = new Date(classInfo.startDate as Date);
      const daysOfWeek = schedule.dayOfWeek;
      const jsDays = daysOfWeek.map((d: number) => (d === 8 ? 0 : d - 1));
      
      let current = new Date(start);
      // Generate enough dates
      const targetSessionIndex = (lesson.order || 0) + 1; // Buổi học tiếp theo
      
      while (dates.length <= targetSessionIndex && dates.length < 50) {
        if (jsDays.includes(current.getDay())) {
          dates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }

      if (dates[targetSessionIndex]) {
        const deadline = new Date(dates[targetSessionIndex]);
        if (schedule.startTime) {
          const [hours, mins] = schedule.startTime.split(':').map(Number);
          deadline.setHours(hours, mins, 0, 0);
        }
        deadline.setHours(deadline.getHours() - 12);
        return deadline;
      }

      return null;
    } catch {
      return null;
    }
  }
}
