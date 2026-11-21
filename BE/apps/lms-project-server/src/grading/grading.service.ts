import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GradingService {
    constructor(private readonly prisma: PrismaService) {}

    // ── GradeConfig ──────────────────────────────────────────────

    async getGradeConfig(courseId: string) {
        return this.prisma.gradeConfig.findUnique({ where: { courseId } });
    }

    async upsertGradeConfig(courseId: string, data: {
        attendanceWeight: number;
        homeworkWeight: number;
        quizWeight: number;
        examWeight: number;
        passingScore: number;
    }) {
        const total = data.attendanceWeight + data.homeworkWeight + data.quizWeight + data.examWeight;
        if (Math.abs(total - 100) > 0.01) {
            throw new Error(`Tổng tỉ trọng phải bằng 100%. Hiện tại: ${total}%`);
        }
        return this.prisma.gradeConfig.upsert({
            where: { courseId },
            create: { courseId, ...data },
            update: data,
        });
    }

    // ── ExamScore ─────────────────────────────────────────────────

    async getExamScores(classId: string) {
        return this.prisma.examScore.findMany({
            where: { classId },
            include: { student: { select: { id: true, fullName: true, username: true, email: true } } },
            orderBy: { student: { fullName: 'asc' } },
        });
    }

    async upsertExamScore(classId: string, studentId: string, score: number, note?: string) {
        return this.prisma.examScore.upsert({
            where: { classId_studentId: { classId, studentId } },
            create: { classId, studentId, score, note },
            update: { score, note },
        });
    }

    async bulkUpsertExamScores(classId: string, scores: { studentId: string; score: number; note?: string }[]) {
        const results = await Promise.all(
            scores.map(({ studentId, score, note }) =>
                this.upsertExamScore(classId, studentId, score, note)
            )
        );
        return { count: results.length };
    }

    // ── Tính điểm tổng kết ────────────────────────────────────────

    async calculateClassResults(classId: string) {
        // Lấy thông tin lớp + khóa học + cấu hình điểm
        const cls = await this.prisma.class.findUnique({
            where: { id: classId },
            include: {
                course: { include: { gradeConfig: true } },
                enrollments: { include: { student: { select: { id: true, fullName: true, username: true } } } },
            },
        });

        if (!cls) throw new Error('Không tìm thấy lớp học');

        const config = cls.course?.gradeConfig;
        const weights = {
            attendance: config?.attendanceWeight ?? 10,
            homework: config?.homeworkWeight ?? 30,
            quiz: config?.quizWeight ?? 20,
            exam: config?.examWeight ?? 40,
            passing: config?.passingScore ?? 5.0,
        };

        const totalSessions = cls.sessionCount || 1;
        
        // Lấy thông tin bài học và số lượng bài tập mỗi bài học của khóa
        const lessonsWithHomeworks = await this.prisma.lesson.findMany({
            where: { courseId: cls.courseId ?? undefined },
            include: { homeworks: { select: { id: true } } }
        });
        const lessonsHavingHomeworks = lessonsWithHomeworks.filter(l => l.homeworks.length > 0);
        const totalLessonsWithHomework = lessonsHavingHomeworks.length;

        // Tổng số quiz và video của khóa học
        const totalQuizzes = await this.prisma.quiz.count({
            where: { lesson: { courseId: cls.courseId ?? undefined } }
        });
        const totalVideos = await this.prisma.video.count({
            where: { lesson: { courseId: cls.courseId ?? undefined } }
        });

        const results = [];

        for (const enrollment of cls.enrollments) {
            const studentId = enrollment.studentId;
            // Bỏ qua nếu studentId null (dữ liệu không hợp lệ)
            if (!studentId) continue;

            // 1. Điểm chuyên cần: tính theo số buổi có mặt
            // Quy tắc: 2 buổi muộn (late) = 1 buổi vắng (absent)
            const attendances = await this.prisma.attendance.findMany({
                where: { classId, studentId },
            });
            const presentCount = attendances.filter(a => a.status === 'present').length;
            const lateCount = attendances.filter(a => a.status === 'late').length;
            // Quy đổi: mỗi 2 lần muộn = 1 buổi vắng (số lẻ không tính)
            const lateAbsentEquivalent = Math.floor(lateCount / 2);
            // Số buổi vắng thực tế (quy đổi muộn vào)
            const effectiveAbsent = (totalSessions - presentCount - lateCount) + lateAbsentEquivalent;
            // Số buổi "có mặt" theo quy đổi
            const effectivePresentCount = totalSessions - effectiveAbsent;
            const attendanceScore = totalSessions > 0 ? Math.min((effectivePresentCount / totalSessions) * 10, 10) : 0;

            // 2. Điểm bài tập: tính theo tiến độ bài học (Hoàn thành bài tập của bài học)
            // Một bài học được coi là hoàn thành bài tập nếu làm đủ 4 bài (với bài có >=4 bài tập) hoặc làm hết (với bài có <4 bài tập)
            const submissions = await this.prisma.assignmentSubmission.findMany({
                where: { classId, studentId },
                select: { homeworkId: true }
            });
            
            let completedLessonsCount = 0;
            for (const lesson of lessonsHavingHomeworks) {
                const totalCount = lesson.homeworks.length;
                const submittedCount = lesson.homeworks.filter(hw => 
                    submissions.some(s => s.homeworkId === hw.id)
                ).length;
                
                const isCompleted = totalCount >= 4 ? submittedCount >= 4 : submittedCount >= totalCount;
                if (isCompleted) {
                    completedLessonsCount++;
                }
            }

            const homeworkScore = totalLessonsWithHomework > 0
                ? (completedLessonsCount / totalLessonsWithHomework) * 10
                : 0;

            // 3. Điểm quiz: tổng điểm các lần làm quiz / tổng số quiz của khóa học
            // Điểm quiz lưu trong DB đang là thang 100, cần chia 10 để về thang 10
            const quizAttempts = await this.prisma.quizAttempt.findMany({
                where: { studentId, quiz: { lesson: { courseId: cls.courseId ?? undefined } } },
            });
            
            let totalQuizScore = 0;
            if (quizAttempts.length > 0) {
                // Nhóm theo quizId và lấy max score (đã quy đổi về thang 10)
                const quizMaxScores: Record<string, number> = {};
                for (const attempt of quizAttempts) {
                    // Xử lý tương thích ngược: nếu điểm > 10 tức là dữ liệu cũ (thang 100) thì chia 10
                    const score10 = attempt.score > 10 ? attempt.score / 10 : attempt.score;
                    if (!quizMaxScores[attempt.quizId] || score10 > quizMaxScores[attempt.quizId]) {
                        quizMaxScores[attempt.quizId] = score10;
                    }
                }
                totalQuizScore = Object.values(quizMaxScores).reduce((sum, score) => sum + score, 0);
            }
            
            const quizScore = totalQuizzes > 0
                ? totalQuizScore / totalQuizzes
                : 0;

            // 4. Điểm thi cuối khóa
            const examEntry = await this.prisma.examScore.findUnique({
                where: { classId_studentId: { classId, studentId } },
            });
            const examScore = examEntry?.score ?? null;

            // 5. Tính tổng
            const totalScore =
                (attendanceScore * weights.attendance / 100) +
                (homeworkScore * weights.homework / 100) +
                (quizScore * weights.quiz / 100) +
                ((examScore ?? 0) * weights.exam / 100);

            // 6. Các điều kiện làm không đạt (Trượt môn)
            // 6.1. Nghỉ quá 20% số buổi (áp dụng quy đổi: 2 muộn = 1 vắng)
            const absentRatio = totalSessions > 0 ? effectiveAbsent / totalSessions : 0;
            const isAttendancePassed = absentRatio <= 0.2;

            // 6.2. Elearning (quiz + video) phải hoàn thành 100%
            // Lọc ra các quiz đã làm ĐẠT (passed = true, tương đương >= 80% hoặc 8.0 điểm)
            const passedQuizIds = new Set(quizAttempts.filter(a => a.passed).map(a => a.quizId));
            const isQuizCompleted = passedQuizIds.size >= totalQuizzes;
            
            // Đếm số video đã xem (dựa vào progress):
            const progresses = await this.prisma.progress.findMany({
                where: { studentId, lesson: { courseId: cls.courseId ?? undefined } }
            });
            let watchedVideosCount = 0;
            for (const p of progresses) {
                if (p.completedItems && Array.isArray(p.completedItems)) {
                    watchedVideosCount += p.completedItems.length;
                }
            }
            const isVideoCompleted = watchedVideosCount >= totalVideos;

            const isPassed = (totalScore >= weights.passing) && isAttendancePassed && isQuizCompleted && isVideoCompleted;
            const isEligibleForExam = isAttendancePassed && isQuizCompleted && isVideoCompleted;

            // Lưu/cập nhật kết quả
            const result = await this.prisma.classResult.upsert({
                where: { classId_studentId: { classId, studentId } },
                create: {
                    classId,
                    studentId,
                    attendanceScore: parseFloat(attendanceScore.toFixed(2)),
                    homeworkScore: parseFloat(homeworkScore.toFixed(2)),
                    quizScore: parseFloat(quizScore.toFixed(2)),
                    examScore,
                    totalScore: parseFloat(totalScore.toFixed(2)),
                    isPassed,
                    isEligibleForExam,
                    calculatedAt: new Date(),
                    status: 'draft',
                },
                update: {
                    attendanceScore: parseFloat(attendanceScore.toFixed(2)),
                    homeworkScore: parseFloat(homeworkScore.toFixed(2)),
                    quizScore: parseFloat(quizScore.toFixed(2)),
                    examScore,
                    totalScore: parseFloat(totalScore.toFixed(2)),
                    isPassed,
                    isEligibleForExam,
                    calculatedAt: new Date(),
                },
                include: { student: { select: { id: true, fullName: true, username: true } } },
            });

            results.push(result);
        }

        return results;
    }

    // ── ClassResult ────────────────────────────────────────────────

    async getClassResults(classId: string) {
        return this.prisma.classResult.findMany({
            where: { classId },
            include: { student: { select: { id: true, fullName: true, username: true, email: true } } },
            orderBy: { totalScore: 'desc' },
        });
    }

    async publishClassResults(classId: string) {
        return this.prisma.classResult.updateMany({
            where: { classId },
            data: { status: 'published', publishedAt: new Date() },
        });
    }

    // Học viên xem điểm của mình theo lớp/khóa học
    async getStudentResults(studentId: string, classId?: string) {
        const where: any = { studentId, status: 'published' };
        if (classId) where.classId = classId;
        return this.prisma.classResult.findMany({
            where,
            include: {
                class: {
                    select: {
                        id: true,
                        title: true,
                        course: { select: { id: true, title: true, gradeConfig: true } },
                    },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }
}
