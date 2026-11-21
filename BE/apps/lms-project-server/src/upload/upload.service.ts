import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as path from 'path';
import * as fs from 'fs';

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

@Injectable()
export class UploadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {
    // Ensure uploads directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  }

  getFileUrl(filename: string): string {
    return `/uploads/${filename}`;
  }

  deleteFile(filename: string) {
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  detectFileType(mimetype: string): string {
    if (mimetype === 'application/pdf') return 'pdf';
    if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return 'slide';
    if (mimetype.includes('zip') || mimetype.includes('text/')) return 'code';
    return 'other';
  }

  // Lesson Attachments
  async createAttachment(data: {
    lessonId: string;
    title: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimetype: string;
    category?: string;
    publicId?: string;
  }) {
    return this.prisma.attachment.create({
      data: {
        lessonId: data.lessonId,
        title: data.title,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: this.detectFileType(data.mimetype),
        category: data.category || this.detectFileType(data.mimetype),
        publicId: data.publicId,
      },
    });
  }

  async getAttachments(lessonId: string) {
    return this.prisma.attachment.findMany({
      where: { lessonId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteAttachment(id: string) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    if (attachment) {
      if (attachment.publicId) {
        // Delete from Cloudinary
        try {
          await this.deleteFromCloudinary(attachment.publicId, attachment.fileType || 'other');
        } catch (error) {
          console.error('Lỗi khi xóa file trên Cloudinary:', error);
        }
      } else {
        // Delete from local
        const filename = attachment.fileUrl.replace('/uploads/', '');
        this.deleteFile(filename);
      }
      await this.prisma.attachment.delete({ where: { id } });
    }
    return { message: 'Đã xóa tệp đính kèm' };
  }

  async deleteFromCloudinary(publicId: string, fileType: string) {
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    
    let resourceType = 'image';
    if (fileType === 'slide' || fileType === 'code' || fileType === 'other' || fileType === 'pdf') {
      resourceType = 'raw';
    } else if (fileType === 'video') {
      resourceType = 'video';
    }
    
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, { resource_type: resourceType }, (error: any, result: any) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  // Homework Submissions
  async submitHomework(data: {
    homeworkId: string;
    classId: string;
    studentId: string;
    githubLink: string;
    note?: string;
  }) {
    // Tìm thông tin bài tập và lớp học
    const homework = await this.prisma.homework.findUnique({
      where: { id: data.homeworkId },
      include: { lesson: true }
    });
    if (!homework || !homework.lesson) throw new Error('Bài tập không tồn tại');
    
    const lesson = homework.lesson;

    const classInfo = await this.prisma.class.findUnique({
      where: { id: data.classId },
      include: { schedule: true },
    });
    if (!classInfo) throw new Error('Lớp học không tồn tại');

    let isLate = false;

    // Tính toán hạn nộp: 12h trước buổi học tiếp theo
    if (classInfo.startDate && classInfo.schedule?.dayOfWeek) {
      const dates: Date[] = [];
      const start = new Date(classInfo.startDate);
      const daysOfWeek = classInfo.schedule.dayOfWeek;
      const jsDays = daysOfWeek.map((d: number) => (d === 8 ? 0 : d - 1));
      
      let current = new Date(start);
      // Generate enough dates to cover this lesson + next lesson
      const targetSessionIndex = (lesson.order || 0) + 1; // Buổi học tiếp theo
      
      while (dates.length <= targetSessionIndex && dates.length < 50) {
        if (jsDays.includes(current.getDay())) {
          dates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }

      if (dates[targetSessionIndex]) {
        // Hạn chót là 12h trước ngày học tiếp theo
        const deadline = new Date(dates[targetSessionIndex]);
        // Tùy theo giờ học (startTime), ở đây tạm tính 12h trước 00:00 của ngày đó, 
        // hoặc chính xác hơn: lấy startTime nếu có
        if (classInfo.schedule.startTime) {
          const [hours, mins] = classInfo.schedule.startTime.split(':').map(Number);
          deadline.setHours(hours, mins, 0, 0);
        }
        deadline.setHours(deadline.getHours() - 12);
        
        isLate = new Date() > deadline;
      }
    }

    // Kiểm tra đã nộp chưa
    const existing = await this.prisma.assignmentSubmission.findFirst({
      where: { homeworkId: data.homeworkId, classId: data.classId, studentId: data.studentId },
      orderBy: { submittedAt: 'asc' },
    });

    const effectiveIsLate = existing ? existing.isLate : isLate;

    let result;
    if (existing) {
      // Cập nhật bài nộp
      result = await this.prisma.assignmentSubmission.update({
        where: { id: existing.id },
        data: {
          githubLink: data.githubLink,
          note: data.note,
          submittedAt: new Date(),
          isLate: effectiveIsLate,
          status: 'SUBMITTED', // Reset trạng thái về đã nộp để GV chấm lại
          reviewedAt: null,
        },
      });
    } else {
      // Tạo mới
      result = await this.prisma.assignmentSubmission.create({
        data: {
          homeworkId: data.homeworkId,
          classId: data.classId,
          studentId: data.studentId,
          githubLink: data.githubLink,
          note: data.note,
          isLate: effectiveIsLate,
        },
      });
    }

    // Thông báo cho Giảng viên
    if (classInfo.teacherId) {
      const student = await this.prisma.user.findUnique({ where: { id: data.studentId }, select: { fullName: true, username: true } });
      const studentName = student?.fullName || student?.username || 'Một học viên';
      
        await this.notificationsService.createAndSend({
          userId: classInfo.teacherId,
          title: '📝 Có bài nộp mới',
          message: `Học viên ${studentName} vừa ${existing ? 'cập nhật' : 'nộp'} bài tập "${homework.title}" thuộc "${homework.lesson.title}" ở lớp "${classInfo.title}".`,
          type: 'info',
          link: `/teacher/class/${data.classId}/assignments?lessonId=${homework.lessonId}`,
        });
    }

    return result;
  }

  async getSubmissions(classId: string, homeworkId: string) {
    return this.prisma.assignmentSubmission.findMany({
      where: { classId, homeworkId },
      include: {
        student: { select: { id: true, username: true, fullName: true, avatar: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getMySubmission(classId: string, homeworkId: string, studentId: string) {
    return this.prisma.assignmentSubmission.findFirst({
      where: { classId, homeworkId, studentId },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getMyClassSubmissions(classId: string, studentId: string) {
    return this.prisma.assignmentSubmission.findMany({
      where: { classId, studentId },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getClassSubmissions(classId: string) {
    return this.prisma.assignmentSubmission.findMany({
      where: { classId },
      include: {
        student: { select: { id: true, username: true, fullName: true, avatar: true, email: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /**
   * Giáo viên chấm trạng thái bài nộp
   * status: GRADED | RETURNED
   */
  async reviewSubmission(data: {
    submissionId: string;
    status: 'GRADED' | 'RETURNED';
    teacherFeedback?: string;
    teacherId: string;
  }) {
    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { id: data.submissionId },
      include: {
        homework: { include: { lesson: { include: { course: true } } } },
        student: { select: { id: true, fullName: true } },
      },
    });

    if (!submission) throw new Error('Không tìm thấy bài nộp');

    // Cập nhật trạng thái
    const updated = await this.prisma.assignmentSubmission.update({
      where: { id: data.submissionId },
      data: {
        status: data.status,
        teacherFeedback: data.teacherFeedback || null,
        reviewedAt: new Date(),
      },
    });

    // Chuẩn bị nội dung thông báo
    const hwTitle = submission.homework?.title || 'Bài tập';
    const lessonTitle = submission.homework?.lesson?.title || 'Bài học';
    const courseId = submission.homework?.lesson?.courseId;
    const lessonId = submission.homework?.lessonId;

    let title: string;
    let message: string;
    let type: string;

    if (data.status === 'GRADED') {
      title = '✅ Bài tập đã được chấm';
      message = `Bài tập "${hwTitle}" trong bài học "${lessonTitle}" đã được giáo viên chấm hoàn thành.${data.teacherFeedback ? ` Nhận xét: ${data.teacherFeedback}` : ''}`;
      type = 'success';
    } else {
      title = '⚠️ Bài tập cần làm lại';
      message = `Bài tập "${hwTitle}" trong bài học "${lessonTitle}" đã được trả lại. Vui lòng chỉnh sửa và nộp lại.${data.teacherFeedback ? ` Lý do: ${data.teacherFeedback}` : ''}`;
      type = 'warning';
    }

    // Link dẫn vào bài học
    const link = courseId && lessonId ? `/student/course/${courseId}/learning/${lessonId}_hw` : undefined;

    // Gửi thông báo realtime
    await this.notificationsService.createAndSend({
      userId: submission.studentId,
      title,
      message,
      type,
      link,
    });

    return updated;
  }
}
