import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.MAIL_PORT || '587'),
      secure: process.env.MAIL_SECURE === 'true',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  async sendDeadlineReminder(opts: {
    to: string;
    studentName: string;
    courseName: string;
    sessionNo: number;
    classTime: string;   // e.g. "08:00 sáng mai"
    deadline: string;    // e.g. "20:00 tối nay"
    lessonsCount: number;
  }) {
    const subject = `[LMS] Nhắc nhở: Hoàn thành bài học trước buổi học số ${opts.sessionNo}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin:0">⏰ Nhắc nhở học tập</h2>
        </div>
        <div style="padding: 24px; background: #f9f9f9; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <p>Xin chào <strong>${opts.studentName}</strong>,</p>
          <p>Bạn có <strong>${opts.lessonsCount} bài học</strong> cần hoàn thành cho khóa <strong>${opts.courseName}</strong>.</p>
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 16px 0; border-radius: 4px;">
            <p style="margin:0"><strong>📅 Ca học:</strong> ${opts.classTime}</p>
            <p style="margin:0; margin-top: 8px"><strong>⏰ Hạn chót nộp:</strong> ${opts.deadline}</p>
          </div>
          <p>Hãy hoàn thành bài học trước hạn để không bị tính là <strong style="color:#ef4444">Hoàn thành muộn</strong>.</p>
          <a href="${process.env.APP_URL || 'http://localhost:8080'}/student/my-courses" 
             style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 8px;">
            Vào học ngay →
          </a>
          <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
            Email này được gửi tự động từ hệ thống LMS. Vui lòng không reply.
          </p>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"LMS System" <${process.env.MAIL_USER}>`,
        to: opts.to,
        subject,
        html,
      });
      this.logger.log(`Email nhắc nhở đã gửi đến ${opts.to}`);
    } catch (error) {
      this.logger.error(`Lỗi gửi email đến ${opts.to}: ${(error as Error).message}`);
    }
  }

  async sendVerificationCode(to: string, name: string, code: string) {
    const subject = `[LMS] Mã xác nhận đăng nhập lần đầu`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin:0">Mã xác nhận bảo mật</h2>
        </div>
        <div style="padding: 24px; background: #f9f9f9; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <p>Xin chào <strong>${name}</strong>,</p>
          <p>Bạn đang đăng nhập vào hệ thống LMS lần đầu tiên. Đây là mã xác nhận của bạn:</p>
          <div style="background: #e0e7ff; border-left: 4px solid #4f46e5; padding: 12px; margin: 16px 0; border-radius: 4px; text-align: center; font-size: 24px; letter-spacing: 4px; font-weight: bold;">
            ${code}
          </div>
          <p>Mã này sẽ hết hạn sau 10 phút. Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
            Email này được gửi tự động từ hệ thống LMS. Vui lòng không reply.
          </p>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"LMS System" <${process.env.MAIL_USER}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`Email mã xác nhận đã gửi đến ${to}`);
    } catch (error) {
      this.logger.error(`Lỗi gửi email xác nhận đến ${to}: ${(error as Error).message}`);
    }
  }

  async sendPasswordResetCode(to: string, name: string, code: string) {
    const subject = `[LMS] Mã xác nhận lấy lại mật khẩu`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin:0">Mã xác nhận khôi phục mật khẩu</h2>
        </div>
        <div style="padding: 24px; background: #f9f9f9; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <p>Xin chào <strong>${name}</strong>,</p>
          <p>Bạn vừa yêu cầu lấy lại mật khẩu. Đây là mã xác nhận (OTP) của bạn:</p>
          <div style="background: #e0e7ff; border-left: 4px solid #4f46e5; padding: 12px; margin: 16px 0; border-radius: 4px; text-align: center; font-size: 24px; letter-spacing: 4px; font-weight: bold;">
            ${code}
          </div>
          <p>Mã này sẽ hết hạn sau 10 phút. Nếu bạn không yêu cầu mã này, mật khẩu của bạn vẫn an toàn và bạn có thể bỏ qua email này.</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
            Email này được gửi tự động từ hệ thống LMS. Vui lòng không reply.
          </p>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"LMS System" <${process.env.MAIL_USER}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`Email lấy lại mật khẩu đã gửi đến ${to}`);
    } catch (error) {
      this.logger.error(`Lỗi gửi email lấy lại mật khẩu đến ${to}: ${(error as Error).message}`);
    }
  }
}
