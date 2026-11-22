import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EnrollmentServiceBase } from "./base/enrollment.service.base";

import { Prisma } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class EnrollmentService extends EnrollmentServiceBase {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService
  ) {
    super(prisma);
  }

  async createEnrollment(args: Prisma.EnrollmentCreateArgs) {
    const studentId = (args.data as any)?.student?.connect?.id || (args.data as any)?.studentId;
    const classId = (args.data as any)?.class?.connect?.id || (args.data as any)?.classId;

    // Nghiệp vụ ràng buộc: Kiểm tra trùng lịch học viên khi thêm vào lớp mới
    if (studentId && classId) {
      const targetClass = await this.prisma.class.findUnique({
        where: { id: classId },
        include: { schedule: true },
      });

      if (targetClass && targetClass.schedule && targetClass.schedule.dayOfWeek && targetClass.schedule.shift) {
        // Lấy tất cả lớp học đang hoạt động mà học viên đang theo học
        const existingEnrollments = await this.prisma.enrollment.findMany({
          where: {
            studentId,
            status: "active",
            classId: { not: classId },
          },
          include: {
            class: {
              include: { schedule: true },
            },
          },
        });

        for (const en of existingEnrollments) {
          const otherClass = en.class;
          if (!otherClass || otherClass.status === "cancelled" || otherClass.status === "finished") continue;
          const otherSchedule = otherClass.schedule;
          if (!otherSchedule?.shift || !otherSchedule?.dayOfWeek) continue;

          // Kiểm tra trùng ca học
          if (otherSchedule.shift === targetClass.schedule.shift) {
            // Kiểm tra trùng thứ trong tuần
            const hasCommonDay = otherSchedule.dayOfWeek.some((day: number) =>
              targetClass.schedule!.dayOfWeek.includes(day)
            );

            if (hasCommonDay) {
              // Kiểm tra trùng khoảng thời gian (startDate -> endDate)
              const startA = new Date(targetClass.startDate || "1970-01-01");
              const endA = new Date(targetClass.endDate || "9999-12-31");
              const startB = new Date(otherClass.startDate || "1970-01-01");
              const endB = new Date(otherClass.endDate || "9999-12-31");

              if (startA <= endB && startB <= endA) {
                const shiftName = targetClass.schedule.shift;
                throw new BadRequestException(
                  `Trùng lịch học viên: Học viên đã có lịch học lớp "${otherClass.title}" trùng ca (${shiftName}) và trùng ngày học trong tuần.`
                );
              }
            }
          }
        }
      }
    }

    const enrollment = await super.createEnrollment(args);

    // Tìm thông tin lớp học và học viên
    if (enrollment.classId && enrollment.studentId) {
      const [classInfo, studentInfo] = await Promise.all([
        this.prisma.class.findUnique({ where: { id: enrollment.classId } }),
        this.prisma.user.findUnique({ where: { id: enrollment.studentId } })
      ]);

      // Báo cho Giáo vụ quản lý lớp
      if (classInfo && classInfo.managerId && studentInfo) {
        const studentName = studentInfo.fullName || studentInfo.username || 'Một học viên';
        await this.notificationsService.createAndSend({
          userId: classInfo.managerId,
          title: '👤 Học viên mới',
          message: `Học viên ${studentName} vừa được ghi danh vào lớp "${classInfo.title}" do bạn quản lý.`,
          type: 'info',
          link: `/staff/class/${classInfo.id}`,
        });
      }
    }

    return enrollment;
  }
}
