import { Injectable } from "@nestjs/common";
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
