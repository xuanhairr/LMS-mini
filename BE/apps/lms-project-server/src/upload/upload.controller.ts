import {
  Controller, Post, Get, Delete, Param, Body, Req, Query,
  UseInterceptors, UploadedFile, UseGuards, BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { UploadService, UPLOAD_DIR } from './upload.service';
import { DefaultAuthGuard } from '../auth/defaultAuth.guard';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('upload')
@Controller('upload')
@UseGuards(DefaultAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /** Giáo viên upload tài liệu đính kèm cho bài học */
  @Post('lesson/:lessonId/attachment')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: UPLOAD_DIR,
      filename: (req, file, cb) => {
        const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
        cb(null, uniqueName);
      },
    }),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
      const allowed = [
        'application/pdf',
        'application/zip',
        'application/x-zip-compressed',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
      ];
      if (allowed.includes(file.mimetype) || file.mimetype.startsWith('text/')) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Định dạng file không được hỗ trợ'), false);
      }
    },
  }))
  async uploadAttachment(
    @Param('lessonId') lessonId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    let fileUrl = '';
    let fileName = '';
    let fileSize = 0;
    let mimetype = '';
    let publicId = '';
    
    if (file) {
      // Tải lên local
      fileUrl = this.uploadService.getFileUrl(file.filename);
      fileName = file.originalname;
      fileSize = file.size;
      mimetype = file.mimetype;
    } else if (body.fileUrl) {
      // Đã tải lên Cloudinary từ FE
      fileUrl = body.fileUrl;
      fileName = body.fileName || 'document';
      fileSize = body.fileSize || 0;
      mimetype = body.mimetype || 'application/octet-stream';
      publicId = body.publicId;
    } else {
      throw new BadRequestException('Vui lòng chọn file hoặc cung cấp URL');
    }
    
    return this.uploadService.createAttachment({
      lessonId,
      title: body.title || fileName,
      fileUrl,
      fileName,
      fileSize,
      mimetype,
      category: body.category,
      publicId,
    });
  }

  /** Lấy danh sách tài liệu đính kèm của bài học */
  @Get('lesson/:lessonId/attachments')
  async getAttachments(@Param('lessonId') lessonId: string) {
    return this.uploadService.getAttachments(lessonId);
  }

  /** Xóa tài liệu đính kèm */
  @Delete('attachment/:id')
  async deleteAttachment(@Param('id') id: string) {
    return this.uploadService.deleteAttachment(id);
  }

  /** Xóa file trên Cloudinary bằng publicId */
  @Delete('cloudinary')
  async deleteCloudinary(@Query('publicId') publicId: string, @Query('resourceType') resourceType: string) {
    return this.uploadService.deleteFromCloudinary(publicId, resourceType || 'auto');
  }

  /** Học sinh nộp bài tập (link github) */
  @Post('homework/:homeworkId/submit')
  async submitHomework(
    @Param('homeworkId') homeworkId: string,
    @Body('classId') classId: string,
    @Body('githubLink') githubLink: string,
    @Body('note') note: string,
    @Req() req: any,
  ) {
    if (!githubLink) throw new BadRequestException('Link Github là bắt buộc');
    if (!classId) throw new BadRequestException('classId là bắt buộc');

    return this.uploadService.submitHomework({
      homeworkId,
      classId,
      studentId: req.user.id,
      githubLink,
      note,
    });
  }

  /** Lấy danh sách bài nộp của class/lesson */
  @Get('class/:classId/homework/:homeworkId/submissions')
  async getSubmissions(
    @Param('classId') classId: string,
    @Param('homeworkId') homeworkId: string
  ) {
    return this.uploadService.getSubmissions(classId, homeworkId);
  }

  /** Học sinh xem bài nộp của mình */
  @Get('class/:classId/homework/:homeworkId/my-submission')
  async getMySubmission(
    @Param('classId') classId: string,
    @Param('homeworkId') homeworkId: string,
    @Req() req: any
  ) {
    return this.uploadService.getMySubmission(classId, homeworkId, req.user.id);
  }

  /** Học sinh xem tất cả bài nộp của mình trong 1 lớp */
  @Get('class/:classId/my-submissions')
  async getMyClassSubmissions(
    @Param('classId') classId: string,
    @Req() req: any
  ) {
    return this.uploadService.getMyClassSubmissions(classId, req.user.id);
  }

  /** Lấy tất cả bài nộp của lớp học */
  @Get('class/:classId/submissions')
  async getClassSubmissions(
    @Param('classId') classId: string
  ) {
    return this.uploadService.getClassSubmissions(classId);
  }

  /** Giáo viên cập nhật trạng thái bài nộp (Đã chấm / Trả bài) */
  @Post('homework/submission/:id/review')
  async reviewSubmission(
    @Param('id') submissionId: string,
    @Body('status') status: 'GRADED' | 'RETURNED',
    @Body('teacherFeedback') teacherFeedback: string,
    @Req() req: any,
  ) {
    if (!status || !['GRADED', 'RETURNED'].includes(status)) {
      throw new BadRequestException('Trạng thái không hợp lệ. Chỉ chấp nhận GRADED hoặc RETURNED.');
    }
    return this.uploadService.reviewSubmission({
      submissionId,
      status,
      teacherFeedback,
      teacherId: req.user.id,
    });
  }
}
