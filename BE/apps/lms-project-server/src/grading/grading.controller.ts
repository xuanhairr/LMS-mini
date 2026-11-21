import { Controller, Get, Post, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { GradingService } from './grading.service';
import { DefaultAuthGuard } from '../auth/defaultAuth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('grading')
@UseGuards(DefaultAuthGuard)
export class GradingController {
    constructor(
        private readonly gradingService: GradingService,
        private readonly prisma: PrismaService
    ) {}

    // ── GradeConfig ────────────────────────────────────────────────

    @Get('config/course/:courseId')
    async getConfig(@Param('courseId') courseId: string) {
        return this.gradingService.getGradeConfig(courseId);
    }

    @Put('config/course/:courseId')
    async upsertConfig(@Req() req: any, @Param('courseId') courseId: string, @Body() body: {
        attendanceWeight: number;
        homeworkWeight: number;
        quizWeight: number;
        examWeight: number;
        passingScore: number;
    }) {
        const roles = req.user.roles as string[];
        let isAllowed = roles.includes('ADMIN') || roles.includes('HEAD_STAFF');
        
        if (!isAllowed && roles.includes('TEACHER')) {
            const course = await this.prisma.course.findUnique({ where: { id: courseId } });
            if (course && course.teacherId === req.user.id) {
                isAllowed = true;
            }
        }
        
        if (!isAllowed) {
            throw new Error('Chỉ Admin, Trưởng ban giáo vụ hoặc Giảng viên phụ trách mới có quyền cấu hình điểm');
        }
        return this.gradingService.upsertGradeConfig(courseId, body);
    }

    // ── ExamScore ──────────────────────────────────────────────────

    @Get('exam-scores/class/:classId')
    async getExamScores(@Param('classId') classId: string) {
        return this.gradingService.getExamScores(classId);
    }

    @Put('exam-scores/class/:classId/student/:studentId')
    async upsertExamScore(
        @Param('classId') classId: string,
        @Param('studentId') studentId: string,
        @Body() body: { score: number; note?: string },
    ) {
        return this.gradingService.upsertExamScore(classId, studentId, body.score, body.note);
    }

    @Post('exam-scores/class/:classId/bulk')
    async bulkUpsertExamScores(
        @Param('classId') classId: string,
        @Body() body: { scores: { studentId: string; score: number; note?: string }[] },
    ) {
        return this.gradingService.bulkUpsertExamScores(classId, body.scores);
    }

    // ── ClassResult ─────────────────────────────────────────────────

    @Get('results/class/:classId')
    async getResults(@Param('classId') classId: string) {
        return this.gradingService.getClassResults(classId);
    }

    @Post('results/class/:classId/calculate')
    async calculate(@Param('classId') classId: string) {
        return this.gradingService.calculateClassResults(classId);
    }

    @Post('results/class/:classId/publish')
    async publish(@Param('classId') classId: string) {
        return this.gradingService.publishClassResults(classId);
    }

    // Học viên tự xem điểm
    @Get('results/my')
    async myResults(@Req() req: any) {
        return this.gradingService.getStudentResults(req.user.id);
    }

    @Get('results/my/class/:classId')
    async myResultByClass(@Req() req: any, @Param('classId') classId: string) {
        return this.gradingService.getStudentResults(req.user.id, classId);
    }
}
