import * as common from "@nestjs/common";
import * as swagger from "@nestjs/swagger";
import { Request } from "express";
import { plainToClass } from "class-transformer";
import { EnrollmentService } from "./enrollment.service";
import { EnrollmentControllerBase } from "./base/enrollment.controller.base";
import { EnrollmentFindManyArgs } from "./base/EnrollmentFindManyArgs";
import { Enrollment } from "./base/Enrollment";
import { ApiNestedQuery } from "../decorators/api-nested-query.decorator";

import { EnrollmentWhereUniqueInput } from "./base/EnrollmentWhereUniqueInput";
import { EnrollmentCreateInput } from "./base/EnrollmentCreateInput";
import * as errors from "../errors";

import { DefaultAuthGuard } from "../auth/defaultAuth.guard";

@swagger.ApiTags("enrollments")
@common.Controller("enrollments")
@common.UseGuards(DefaultAuthGuard)
export class EnrollmentController extends EnrollmentControllerBase {
  constructor(protected readonly service: EnrollmentService) {
    super(service);
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

  private parseQueryValue(value: any): any {
    if (value === "true") return true;
    if (value === "false") return false;
    if (typeof value === "string" && value.includes(",")) {
      const parts = value.split(",");
      const result: any = {};
      parts.forEach(p => result[p.trim()] = true);
      return result;
    }
    if (typeof value === "string") return { [value]: true };
    if (typeof value === "object" && value !== null) {
      // Handle nested strings like { include: 'teacher' } inside course
      for (const key in value) {
        value[key] = this.parseQueryValue(value[key]);
      }
    }
    return value;
  }

  private parseNestedBooleans(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;
    for (const key in obj) {
      if (obj[key] === "true") {
        obj[key] = true;
      } else if (obj[key] === "false") {
        obj[key] = false;
      } else if (typeof obj[key] === 'object') {
        this.parseNestedBooleans(obj[key]);
      }
    }
    return obj;
  }

  @common.Post()
  @common.UseGuards(DefaultAuthGuard)
  @swagger.ApiCreatedResponse({ type: Enrollment })
  // @ts-ignore
  async createEnrollment(
    @common.Body() data: EnrollmentCreateInput,
    @common.Req() request: Request
  ): Promise<Enrollment> {
    console.log('--- ENROLLMENT DEBUG ---');
    console.log('Authorization Header:', request.headers['authorization'] || request.headers['Authorization']);
    const user = (request as any).user;
    console.log('Request User:', user);
    if (!user) {
      throw new common.UnauthorizedException("Người dùng chưa đăng nhập hoặc token không hợp lệ");
    }
    const roles = user.roles as string[];
    console.log('User Roles:', roles);
    if (!roles.includes("ADMIN") && !roles.includes("STAFF") && !roles.includes("HEAD_STAFF")) {
      throw new common.ForbiddenException("Chỉ Admin hoặc Giáo vụ mới có quyền thêm học viên vào lớp");
    }

    try {
      return await super.createEnrollment(data);
    } catch (error: any) {
      if (error?.code === "P2002") {
        throw new common.BadRequestException("Học viên đã tồn tại trong lớp");
      }
      throw error;
    }
  }

  @common.Delete("/:id")
  @common.UseGuards(DefaultAuthGuard)
  @swagger.ApiOkResponse({ type: Enrollment })
  @swagger.ApiNotFoundResponse({ type: errors.NotFoundException })
  // @ts-ignore
  async deleteEnrollment(
    @common.Param() params: EnrollmentWhereUniqueInput,
    @common.Req() request: Request
  ): Promise<Enrollment | null> {
    const user = (request as any).user;
    if (!user) {
      throw new common.UnauthorizedException("Người dùng chưa đăng nhập hoặc token không hợp lệ");
    }
    const roles = user.roles as string[];
    if (!roles.includes("ADMIN") && !roles.includes("STAFF") && !roles.includes("HEAD_STAFF")) {
      throw new common.ForbiddenException("Chỉ Admin hoặc Giáo vụ mới có quyền gỡ học viên khỏi lớp");
    }
    return super.deleteEnrollment(params);
  }

  @common.Get()
  @swagger.ApiOkResponse({ type: [Enrollment] })
  @ApiNestedQuery(EnrollmentFindManyArgs)
  async enrollments(@common.Req() request: Request): Promise<Enrollment[]> {
    const rawQuery = request.query;
    const unflattened = this.unflatten(rawQuery);

    const include = unflattened.include ? this.parseQueryValue(unflattened.include) : undefined;
    const select = unflattened.select ? this.parseQueryValue(unflattened.select) : undefined;

    delete unflattened.include;
    delete unflattened.select;

    const args = plainToClass(EnrollmentFindManyArgs, this.parseNestedBooleans(unflattened));
    const finalArgs: any = {
      ...args,
    };

    if (include) finalArgs.include = include;
    if (select) finalArgs.select = select;

    const results = await this.service.enrollments(finalArgs);

    // Calculate progress for each enrollment
    return Promise.all(results.map(async (e: any) => {
      const studentId = e.studentId || e.student?.id;
      const courseId = e.courseId || e.course?.id;

      if (studentId && courseId) {
        const totalLessons = await (this.service as any).prisma.lesson.count({
          where: { courseId }
        });

        if (totalLessons === 0) {
          e.progress = 0;
        } else {
          const progresses = await (this.service as any).prisma.progress.findMany({
            where: {
              studentId,
              lesson: { courseId },
              completed: true
            },
            select: { lessonId: true }
          });
          const completedLessons = new Set(progresses.map((p: any) => p.lessonId)).size;
          e.progress = Math.round((completedLessons / totalLessons) * 100);
        }
      } else {
        e.progress = 0;
      }
      return e;
    }));
  }

  @common.Get("/:id")
  @swagger.ApiOkResponse({ type: Enrollment })
  @swagger.ApiNotFoundResponse({ type: errors.NotFoundException })
  async enrollment(
    @common.Param() params: EnrollmentWhereUniqueInput,
    @common.Req() request?: Request
  ): Promise<Enrollment | null> {
    const unflattened = request ? this.unflatten(request.query) : {};
    const include = unflattened.include ? this.parseQueryValue(unflattened.include) : undefined;
    const select = unflattened.select ? this.parseQueryValue(unflattened.select) : undefined;

    const result = await this.service.enrollment({
      where: params,
      include,
      select,
    });

    if (result === null) {
      throw new errors.NotFoundException(
        `No resource was found for ${JSON.stringify(params)}`
      );
    }

    // Calculate progress
    const e = result as any;
    const studentId = e.studentId || e.student?.id;
    const courseId = e.courseId || e.course?.id;

    if (studentId && courseId) {
      const totalLessons = await (this.service as any).prisma.lesson.count({
        where: { courseId }
      });

      if (totalLessons === 0) {
        e.progress = 0;
      } else {
        const progresses = await (this.service as any).prisma.progress.findMany({
          where: {
            studentId,
            lesson: { courseId },
            completed: true
          },
          select: { lessonId: true }
        });
        const completedLessons = new Set(progresses.map((p: any) => p.lessonId)).size;
        e.progress = Math.round((completedLessons / totalLessons) * 100);
      }
    } else {
      e.progress = 0;
    }

    return e;
  }
}
