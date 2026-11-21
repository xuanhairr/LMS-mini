import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Chạy mỗi 1 giờ: Quét học viên có deadline trong 24h tới mà chưa hoàn thành bài học
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sendDeadlineReminders() {
    this.logger.log('Đang quét deadline bài học...');

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Lấy tất cả các lớp đang active
    const activeClasses = await this.prisma.class.findMany({
      where: {
        enrollments: { some: { status: 'active' } },
      },
      include: {
        schedule: true,
        course: { include: { lessons: { orderBy: { order: 'asc' } } } },
        enrollments: {
          where: { status: 'active' },
          include: { student: true },
        },
      },
    });

    for (const cls of activeClasses) {
      if (!cls.startDate || !cls.schedule?.dayOfWeek) continue;

      const dates: Date[] = [];
      const start = new Date(cls.startDate);
      const jsDays = cls.schedule.dayOfWeek.map((d: number) => (d === 8 ? 0 : d - 1));
      
      let current = new Date(start);
      // Generate up to 50 dates
      while (dates.length < 50) {
        if (jsDays.includes(current.getDay())) dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }

      for (const lesson of cls.course?.lessons || []) {
        const targetSessionIndex = (lesson.order || 0) + 1;
        if (!dates[targetSessionIndex]) continue;

        const deadline = new Date(dates[targetSessionIndex]);
        if (cls.schedule.startTime) {
          const [h, m] = cls.schedule.startTime.split(':').map(Number);
          deadline.setHours(h, m, 0, 0);
        }
        deadline.setHours(deadline.getHours() - 12);

        // Nằm trong 24h tới
        if (deadline >= now && deadline <= in24h) {
          for (const enrollment of cls.enrollments) {
            const student = enrollment.student;
            if (!student || !student.email) continue;

            const completedCount = await this.prisma.progress.count({
              where: {
                studentId: student.id,
                lessonId: lesson.id,
                completed: true,
              },
            });

            if (completedCount > 0) continue; // Đã xong

            const hoursLeft = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
            const deadlineStr = deadline.toLocaleString('vi-VN');
            const classTimeStr = `Buổi học số ${targetSessionIndex}`;

            await this.emailService.sendDeadlineReminder({
              to: student.email,
              studentName: student.fullName || student.username,
              courseName: cls.course?.title || 'Khóa học',
              sessionNo: targetSessionIndex,
              classTime: classTimeStr,
              deadline: deadlineStr,
              lessonsCount: 1, // Báo nhắc cho 1 bài
            });

            this.logger.log(`Đã nhắc ${student.username} - deadline còn ${hoursLeft}h cho bài ${lesson.title}`);
          }
        }
      }
    }
  }

  /**
   * Chạy mỗi 30 phút: Tự động đánh dấu MISSING cho bài học đã quá deadline mà không học
   */
  @Cron('*/30 * * * *')
  async markMissingProgresses() {
    this.logger.log('Kiểm tra bài học quá hạn...');

    const now = new Date();

    const activeClasses = await this.prisma.class.findMany({
      where: {
        enrollments: { some: { status: 'active' } },
      },
      include: {
        schedule: true,
        course: { include: { lessons: { orderBy: { order: 'asc' } } } },
        enrollments: { where: { status: 'active' } },
      },
    });

    for (const cls of activeClasses) {
      if (!cls.startDate || !cls.schedule?.dayOfWeek) continue;

      const dates: Date[] = [];
      const start = new Date(cls.startDate);
      const jsDays = cls.schedule.dayOfWeek.map((d: number) => (d === 8 ? 0 : d - 1));
      
      let current = new Date(start);
      while (dates.length < 50) {
        if (jsDays.includes(current.getDay())) dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }

      for (const lesson of cls.course?.lessons || []) {
        const targetSessionIndex = (lesson.order || 0) + 1;
        if (!dates[targetSessionIndex]) continue;

        const deadline = new Date(dates[targetSessionIndex]);
        if (cls.schedule.startTime) {
          const [h, m] = cls.schedule.startTime.split(':').map(Number);
          deadline.setHours(h, m, 0, 0);
        }
        deadline.setHours(deadline.getHours() - 12);

        // Đã qua hạn
        if (deadline < now) {
          for (const enrollment of cls.enrollments) {
            if (!enrollment.studentId) continue;

            const existing = await this.prisma.progress.findFirst({
              where: { studentId: enrollment.studentId, lessonId: lesson.id },
            });

            if (!existing) {
              await this.prisma.progress.create({
                data: {
                  studentId: enrollment.studentId,
                  lessonId: lesson.id,
                  completed: false,
                  completionStatus: 'MISSING',
                },
              });
            } else if (existing.completionStatus === 'PENDING') {
              await this.prisma.progress.update({
                where: { id: existing.id },
                data: { completionStatus: 'MISSING' },
              });
            }
          }
        }
      }
    }
  }
}
