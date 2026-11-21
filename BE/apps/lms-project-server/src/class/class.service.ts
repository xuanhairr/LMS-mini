import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class ClassService {
    constructor(
        protected readonly prisma: PrismaService,
        private readonly notificationsService: NotificationsService
    ) { }

    async create(data: any) {
        const newClass = await this.prisma.class.create({ 
            data,
            include: { course: true }
        });

        const courseTitle = newClass.course?.title || 'Khóa học';
        const classTitle = newClass.title;

        if (newClass.teacherId) {
            await this.notificationsService.createAndSend({
                userId: newClass.teacherId,
                title: '📢 Phân công giảng dạy',
                message: `Bạn vừa được phân công giảng dạy lớp "${classTitle}" thuộc khóa học "${courseTitle}".`,
                type: 'info',
                link: `/teacher/classes`,
            });
        }

        if (newClass.managerId) {
            await this.notificationsService.createAndSend({
                userId: newClass.managerId,
                title: '💼 Phân công quản lý lớp',
                message: `Bạn vừa được giao theo dõi và quản lý lớp "${classTitle}".`,
                type: 'info',
                link: `/staff/class/${newClass.id}`,
            });
        }

        if (newClass.status === 'active' && newClass.teacherId) {
            await this.notificationsService.createAndSend({
                userId: newClass.teacherId,
                title: '🚀 Lớp học bắt đầu',
                message: `Lớp "${classTitle}" của bạn đã chính thức khai giảng!`,
                type: 'success',
                link: `/teacher/classes`,
            });
        }

        return newClass;
    }

    async findByTitle(title: string, excludeId?: string) {
        if (!title) return null;
        return this.prisma.class.findFirst({
            where: {
                title: { equals: title, mode: 'insensitive' },
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
        });
    }

    async count(args: any) {
        return this.prisma.class.count(args);
    }

    async findMany(args: any) {
        const classes = await this.prisma.class.findMany(args);
        
        const now = new Date();
        const toUpdate = classes.filter((c: any) => c.endDate && new Date(c.endDate) < now && c.status === 'active');
        if (toUpdate.length > 0) {
            await this.prisma.class.updateMany({
                where: { id: { in: toUpdate.map((c: any) => c.id) } },
                data: { status: 'finished' }
            });
            classes.forEach((c: any) => {
                if (c.endDate && new Date(c.endDate) < now && c.status === 'active') {
                    c.status = 'finished';
                }
            });
        }

        return classes;
    }

    async findOne(id: string) {
        const classData = await this.prisma.class.findUnique({
            where: { id },
            include: {
                course: true,
                teacher: true,
                manager: true,
                schedule: true,
                enrollments: {
                    include: {
                        student: true,
                    },
                },
            },
        });

        if (classData && classData.endDate && new Date(classData.endDate) < new Date() && classData.status === 'active') {
            await this.prisma.class.update({
                where: { id: classData.id },
                data: { status: 'finished' }
            });
            classData.status = 'finished';
        }

        return classData;
    }

    async getStudentProgress(classId: string, studentId: string) {
        const classData = await this.prisma.class.findUnique({
            where: { id: classId },
            include: {
                course: {
                    include: {
                        lessons: {
                            include: {
                                quizzes: true,
                                homeworks: true,
                                videos: true
                            }
                        }
                    }
                }
            }
        });

        if (!classData || !classData.course) {
            return { quizzes: [], summary: { total: 0, completed: 0, averageScore: 0, progressPercent: 0, preparationPercent: 0, homeworkPercent: 0, submittedHomeworks: 0 } };
        }

        const quizzes = classData.course.lessons.flatMap(lesson => 
            (lesson.quizzes || []).map(q => ({ ...q, lessonTitle: lesson.title }))
        );
        const homeworks = classData.course.lessons.flatMap(lesson => 
            (lesson.homeworks || []).map(hw => ({ ...hw, lessonTitle: lesson.title }))
        );
        const videos = classData.course.lessons.flatMap(lesson => 
            (lesson.videos || []).map(v => ({ ...v, lessonTitle: lesson.title, lessonId: lesson.id }))
        );
        
        const quizAttempts = await this.prisma.quizAttempt.findMany({
            where: {
                studentId: studentId,
                quizId: { in: quizzes.map(q => q.id) }
            },
            orderBy: { createdAt: 'desc' }
        });

        const attemptsMap = new Map();
        quizAttempts.forEach(attempt => {
            const existing = attemptsMap.get(attempt.quizId);
            if (!existing || attempt.score > existing.score) {
                attemptsMap.set(attempt.quizId, attempt);
            }
        });

        const detailedQuizzes = quizzes.map(quiz => {
            const attempt = attemptsMap.get(quiz.id);
            return {
                id: quiz.id,
                title: quiz.title || 'Bài kiểm tra không tên',
                lessonTitle: quiz.lessonTitle,
                type: 'Quiz',
                status: attempt ? (attempt.passed ? 'passed' : 'failed') : 'not_started',
                score: attempt ? attempt.score : null,
                createdAt: attempt ? attempt.createdAt : null
            };
        });

        const homeworkSubmissions = await this.prisma.assignmentSubmission.findMany({
            where: {
                studentId: studentId,
                classId: classId,
                homeworkId: { in: homeworks.map(h => h.id) }
            },
            orderBy: { createdAt: 'desc' }
        });

        const submissionsMap = new Map();
        homeworkSubmissions.forEach(sub => {
            if (!submissionsMap.has(sub.homeworkId)) {
                submissionsMap.set(sub.homeworkId, sub);
            }
        });

        const detailedHomeworks = homeworks.map(hw => {
            const sub = submissionsMap.get(hw.id);
            return {
                id: hw.id,
                title: hw.title || 'Bài tập tự luận',
                level: hw.level || 'Khá',
                lessonTitle: hw.lessonTitle,
                lessonId: hw.lessonId, // Need to make sure hw has lessonId
                type: 'Homework',
                status: sub ? (sub.status === 'GRADED' ? 'graded' : 'submitted') : 'not_started',
                score: null,
                createdAt: sub ? sub.createdAt : null,
                githubLink: sub ? sub.githubLink : null,
                teacherFeedback: sub ? sub.teacherFeedback : null
            };
        });

        const progresses = await this.prisma.progress.findMany({
            where: {
                studentId: studentId,
                lessonId: { in: classData.course.lessons.map(l => l.id) }
            }
        });
        const progressMap = new Map(progresses.map(p => [p.lessonId, p]));

        const detailedVideos = videos.map(video => {
            const p = progressMap.get(video.lessonId);
            // @ts-ignore
            const isCompleted = p && p.completedItems && p.completedItems.includes(video.id);
            return {
                id: video.id,
                title: video.title || 'Video bài giảng',
                lessonTitle: video.lessonTitle,
                type: 'Video',
                status: isCompleted ? 'completed' : 'not_started',
                score: null,
                createdAt: p ? p.updatedAt : null
            };
        });

        const sessions = classData.course.lessons.map((lesson, index) => {
            const lessonHomeworks = detailedHomeworks.filter(h => h.lessonId === lesson.id);
            const submittedCount = lessonHomeworks.filter(h => h.status !== 'not_started').length;
            const totalCount = lessonHomeworks.length;
            const isCompleted = totalCount >= 4 ? submittedCount >= 4 : submittedCount >= totalCount;
            return {
                id: lesson.id,
                title: lesson.title || `Session ${index + 1}`,
                sessionNumber: index + 1,
                submittedCount,
                totalCount,
                isCompleted,
                homeworks: lessonHomeworks
            };
        });

        const preparationItems = [...detailedQuizzes, ...detailedVideos];
        const totalPreparation = preparationItems.length;
        const completedPreparation = preparationItems.filter(i => i.status === 'passed' || i.status === 'completed').length;
        const preparationPercent = totalPreparation > 0 ? Math.round((completedPreparation / totalPreparation) * 100) : 0;

        const totalHomeworks = detailedHomeworks.length;
        const completedHomeworks = detailedHomeworks.filter(h => h.status !== 'not_started').length;
        const homeworkPercent = totalHomeworks > 0 ? Math.round((completedHomeworks / totalHomeworks) * 100) : 0;

        // Giữ nguyên progressPercent cũ để không lỗi FE ở chỗ khác
        const totalQuizzes = detailedQuizzes.length;
        const completedQuizzes = detailedQuizzes.filter(q => q.status !== 'not_started').length;
        const progressPercent = totalQuizzes > 0 ? Math.round((completedQuizzes / totalQuizzes) * 100) : 0;
        
        let totalScore = 0;
        let scoreCount = 0;
        detailedQuizzes.forEach(q => {
            if (q.score !== null) {
                totalScore += q.score;
                scoreCount++;
            }
        });
        const averageScore = scoreCount > 0 ? Number((totalScore / scoreCount).toFixed(1)) : 0;

        const mixedItems = [...detailedQuizzes, ...detailedHomeworks, ...detailedVideos];

        return {
            summary: {
                total: totalQuizzes,
                completed: completedQuizzes,
                averageScore,
                progressPercent,
                preparationPercent,
                homeworkPercent,
                submittedHomeworks: completedHomeworks
            },
            quizzes: mixedItems,
            sessions: sessions
        };
    }

    async update(id: string, data: any) {
        const oldClass = await this.prisma.class.findUnique({ where: { id }, include: { course: true } });
        
        const updatedClass = await this.prisma.class.update({
            where: { id },
            data,
            include: { course: true }
        });

        // Trigger notifications if there are changes
        if (oldClass && updatedClass) {
            const courseTitle = updatedClass.course?.title || 'Khóa học';
            const classTitle = updatedClass.title;

            // 1. Phân công giảng viên mới
            if (updatedClass.teacherId && updatedClass.teacherId !== oldClass.teacherId) {
                await this.notificationsService.createAndSend({
                    userId: updatedClass.teacherId,
                    title: '📢 Phân công giảng dạy',
                    message: `Bạn vừa được phân công giảng dạy lớp "${classTitle}" thuộc khóa học "${courseTitle}".`,
                    type: 'info',
                    link: `/teacher/classes`,
                });
            }

            // 2. Phân công giáo vụ mới
            if (updatedClass.managerId && updatedClass.managerId !== oldClass.managerId) {
                await this.notificationsService.createAndSend({
                    userId: updatedClass.managerId,
                    title: '💼 Phân công quản lý lớp',
                    message: `Bạn vừa được giao theo dõi và quản lý lớp "${classTitle}".`,
                    type: 'info',
                    link: `/staff/class/${id}`,
                });
            }

            // 3. Trạng thái khai giảng
            if (updatedClass.status === 'active' && oldClass.status !== 'active' && updatedClass.teacherId) {
                await this.notificationsService.createAndSend({
                    userId: updatedClass.teacherId,
                    title: '🚀 Lớp học bắt đầu',
                    message: `Lớp "${classTitle}" của bạn đã chính thức khai giảng!`,
                    type: 'success',
                    link: `/teacher/classes`,
                });
            }
            
            // 4. Nhắc nhở phân công giảng viên khi lớp sẵn sàng (cho Giáo vụ quản lý hoặc tất cả giáo vụ)
            if (updatedClass.status === 'ready' && oldClass.status !== 'ready' && !updatedClass.teacherId) {
                const message = `⚠️ Lớp "${classTitle}" đã sẵn sàng khai giảng nhưng chưa có Giảng viên. Vui lòng phân công!`;
                if (updatedClass.managerId) {
                    await this.notificationsService.createAndSend({
                        userId: updatedClass.managerId,
                        title: 'Nhắc nhở phân công',
                        message,
                        type: 'warning',
                        link: `/staff/class/${id}`,
                    });
                } else {
                    // Nếu chưa có giáo vụ quản lý thì báo cho toàn bộ STAFF và HEAD_STAFF
                    const staffs = await this.prisma.user.findMany({
                        where: { roles: { hasSome: ['STAFF', 'HEAD_STAFF'] } }
                    });
                    for (const staff of staffs) {
                        await this.notificationsService.createAndSend({
                            userId: staff.id,
                            title: 'Nhắc nhở phân công',
                            message,
                            type: 'warning',
                            link: `/staff/class/${id}`,
                        });
                    }
                }
            }
        }

        return updatedClass;
    }

    async delete(id: string) {
        return this.prisma.class.delete({
            where: { id },
        });
    }

    async validateImport(classId: string, identifiers: string[]) {
        if (!identifiers || identifiers.length === 0) {
            return [];
        }

        // Tìm các học viên khớp với danh sách identifiers (username hoặc email)
        const users = await this.prisma.user.findMany({
            where: {
                OR: [
                    { username: { in: identifiers } },
                    { email: { in: identifiers } }
                ],
                roles: { has: 'STUDENT' }
            },
            select: { id: true, username: true, email: true, fullName: true }
        });

        const foundUserIds = users.map(u => u.id);

        // Lọc ra các học viên đã có trong lớp
        const existingEnrollments = await this.prisma.enrollment.findMany({
            where: {
                classId,
                studentId: { in: foundUserIds }
            },
            select: { studentId: true }
        });
        const enrolledUserIds = new Set(existingEnrollments.map(e => e.studentId));

        const results = [];

        for (const id of identifiers) {
            const lowerId = id.toLowerCase();
            const matchedUser = users.find(u => u.username?.toLowerCase() === lowerId || u.email?.toLowerCase() === lowerId);

            if (!matchedUser) {
                results.push({
                    identifier: id,
                    status: 'invalid',
                    errMessage: 'Tài khoản không tồn tại hoặc không phải học viên'
                });
                continue;
            }

            if (enrolledUserIds.has(matchedUser.id)) {
                results.push({
                    identifier: id,
                    id: matchedUser.id,
                    username: matchedUser.username,
                    email: matchedUser.email,
                    fullName: matchedUser.fullName,
                    status: 'invalid',
                    errMessage: 'Học viên đã tồn tại trong lớp'
                });
                continue;
            }

            results.push({
                identifier: id,
                id: matchedUser.id,
                username: matchedUser.username,
                email: matchedUser.email,
                fullName: matchedUser.fullName,
                status: 'valid',
                errMessage: null
            });
        }

        return results;
    }

    async enrollBulk(classId: string, userIds: string[]) {
        if (!userIds || userIds.length === 0) return { count: 0 };
        
        const cls = await this.prisma.class.findUnique({ where: { id: classId }});
        const courseId = cls?.courseId;

        let count = 0;
        for (const studentId of userIds) {
            try {
                // Kiểm tra xem đã tồn tại chưa để tránh lỗi
                const existing = await this.prisma.enrollment.findFirst({
                    where: { classId, studentId }
                });
                if (!existing) {
                    await this.prisma.enrollment.create({
                        data: {
                            classId,
                            studentId,
                            courseId
                        }
                    });
                    count++;
                }
            } catch (e) {
                // Bỏ qua lỗi duplicate
            }
        }
        
        return { count };
    }
}
