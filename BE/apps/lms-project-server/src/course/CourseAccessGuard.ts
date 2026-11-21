import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CourseAccessGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const courseId = request.params.id || request.params.courseId;

        if (!user) {
            return false;
        }

        // Admins, Head Staff and Staff have full access
        if (user.roles.includes("ADMIN") || user.roles.includes("HEAD_STAFF") || user.roles.includes("STAFF")) {
            return true;
        }

        if (!courseId) {
            return true; // If no courseId in params, let other guards handle it
        }

        // Check if course exists
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
        });

        if (!course) {
            throw new NotFoundException("Không tìm thấy khóa học");
        }

        // Teachers can access courses they teach or courses of classes they are assigned to
        if (user.roles.includes("TEACHER")) {
            if (course.teacherId === user.id) {
                return true;
            }
            // Check if teacher is assigned to any class of this course
            const teachingClass = await this.prisma.class.findFirst({
                where: {
                    courseId: courseId,
                    teacherId: user.id
                }
            });
            if (teachingClass) {
                return true;
            }
            throw new ForbiddenException("Bạn không có quyền truy cập khóa học này");
        }

        // Students must be enrolled
        if (user.roles.includes("STUDENT")) {
            console.log(`[CourseAccessGuard] Checking STUDENT permissions for user ${user.id} on course ${courseId}`);
            const enrollment = await this.prisma.enrollment.findFirst({
                where: {
                    studentId: user.id,
                    OR: [
                        { courseId: courseId },
                        { class: { courseId: courseId } }
                    ]
                },
            });

            if (enrollment) {
                return true;
            }
            console.warn(`[CourseAccessGuard] Access denied for STUDENT ${user.id}`);
            throw new ForbiddenException("Bạn chưa được ghi danh vào khóa học này");
        }

        return false;
    }
}
