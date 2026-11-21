import * as common from "@nestjs/common";
import * as swagger from "@nestjs/swagger";
import { ClassService } from "./class.service";
import { DefaultAuthGuard } from "../auth/defaultAuth.guard";

@swagger.ApiTags("classes")
@common.Controller("classes")
export class ClassController {
    constructor(protected readonly service: ClassService) { }

    private unflatten(obj: any) {
        const result: any = {};
        for (const i in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, i)) continue;
            const keys = i.split(/[\[\]]+/).filter(Boolean);
            keys.reduce((acc, key, idx) => {
                if (idx === keys.length - 1) {
                    acc[key] = obj[i];
                } else {
                    acc[key] = acc[key] || {};
                }
                return acc[key];
            }, result);
        }
        return result;
    }

    private parseNestedBooleans(obj: any): any {
        if (typeof obj !== 'object' || obj === null) return obj;
        for (const key in obj) {
            if (obj[key] === "true") {
                obj[key] = true;
            } else if (obj[key] === "false") {
                obj[key] = false;
            } else if (obj[key] === "null") {
                obj[key] = null;
            } else if (typeof obj[key] === 'object') {
                this.parseNestedBooleans(obj[key]);
            }
        }
        return obj;
    }

    @common.UseGuards(DefaultAuthGuard)
    @common.Get("/statuses")
    async getStatuses() {
        return {
            pending: { color: 'cyan', label: 'Sắp mở / Gom HV' },
            ready: { color: 'blue', label: 'Sẵn sàng' },
            active: { color: 'green', label: 'Đang diễn ra' },
            finished: { color: 'default', label: 'Đã kết thúc' },
            cancelled: { color: 'red', label: 'Đã hủy' }
        };
    }

    @common.Post()
    @common.UseGuards(DefaultAuthGuard)
    async create(@common.Req() req: any, @common.Body() data: any) {
        const user = req.user;
        const roles = user.roles as string[];

        // Only ADMIN, HEAD_STAFF, and STAFF can create classes
        if (!roles.includes("ADMIN") && !roles.includes("HEAD_STAFF") && !roles.includes("STAFF")) {
            throw new common.ForbiddenException("Chỉ Giáo vụ, Giáo vụ trưởng hoặc Admin mới có quyền tạo lớp học");
        }

        // Validate: tên lớp không được trùng
        const existing = await this.service.findByTitle(data.title?.trim());
        if (existing) {
            throw new common.ConflictException(`Tên lớp học "${data.title}" đã tồn tại trong hệ thống`);
        }

        // Validate: thời gian học là bắt buộc nếu trạng thái yêu cầu
        const requireDates = ['ready', 'active', 'finished'].includes(data.status);
        if (requireDates && (!data.startDate || !data.endDate)) {
            throw new common.BadRequestException('Thời gian khai giảng và kết thúc lớp học là bắt buộc đối với trạng thái Sẵn sàng/Đang diễn ra');
        }
        if (data.endDate && new Date(data.endDate) < new Date(new Date().toDateString())) {
            throw new common.BadRequestException('Ngày kết thúc không được là ngày trong quá khứ');
        }

        const requireTeacher = ['active', 'finished'].includes(data.status);
        if (requireTeacher && !data.teacherId) {
            throw new common.BadRequestException('Giảng viên hướng dẫn là bắt buộc đối với trạng thái Đang diễn ra/Đã kết thúc');
        }

        // Convert scalar IDs → Prisma relation syntax (skip nulls for create)
        const prismaData: any = {
            title: data.title?.trim(),
            status: data.status,
            startDate: data.startDate || null,
            endDate: data.endDate || null,
            sessionCount: data.sessionCount || null,
        };
        if (data.courseId) prismaData.course = { connect: { id: data.courseId } };
        if (data.teacherId) prismaData.teacher = { connect: { id: data.teacherId } };
        if (data.managerId) prismaData.manager = { connect: { id: data.managerId } };

        return this.service.create(prismaData);
    }

    @common.Get()
    @common.UseGuards(DefaultAuthGuard)
    async findMany(@common.Req() req: any, @common.Query() query: any) {
        const user = req.user;
        const roles = user.roles as string[];

        const unflattened = this.unflatten(query);
        const parsedQuery = this.parseNestedBooleans(unflattened);

        // Parse skip and take
        const skip = parsedQuery.skip ? parseInt(parsedQuery.skip as string, 10) : undefined;
        const take = parsedQuery.take ? parseInt(parsedQuery.take as string, 10) : undefined;

        // Build base args
        const args: any = {
            skip,
            take,
            where: parsedQuery.where || {},
            orderBy: query.orderBy || { createdAt: 'desc' },
            include: {
                course: true,
                teacher: true,
                manager: true,
                schedule: true,
                _count: {
                    select: { enrollments: true }
                }
            }
        };

        // Enforce hierarchy filters
        if (roles.includes("TEACHER") && !roles.includes("ADMIN") && !roles.includes("HEAD_STAFF") && !roles.includes("STAFF")) {
            args.where = { ...args.where, teacherId: user.id };
        }

        // Fetch data and count for pagination
        const [data, total] = await Promise.all([
            this.service.findMany(args),
            this.service.count({ where: args.where })
        ]);

        return {
            data: {
                items: data,
                total,
                skip: skip || 0,
                take: take || 10
            }
        };
    }

    @common.Get("/:id")
    async findOne(@common.Param("id") id: string) {
        return this.service.findOne(id);
    }

    @common.Get("/:id/progress/:studentId")
    @common.UseGuards(DefaultAuthGuard)
    async getStudentProgress(@common.Param("id") classId: string, @common.Param("studentId") studentId: string) {
        return this.service.getStudentProgress(classId, studentId);
    }

    @common.Patch("/:id")
    @common.UseGuards(DefaultAuthGuard)
    async update(@common.Req() req: any, @common.Param("id") id: string, @common.Body() data: any) {
        const user = req.user;
        const roles = user.roles as string[];

        // Check ownership if user is a regular STAFF
        if (roles.includes("STAFF") && !roles.includes("ADMIN") && !roles.includes("HEAD_STAFF")) {
            const existingClass = await this.service.findOne(id);
            if (!existingClass || existingClass.managerId !== user.id) {
                throw new common.ForbiddenException("Bạn không có quyền chỉnh sửa lớp học này");
            }
        }

        // Validate: tên lớp không được trùng (khi có thay đổi tên)
        if (data.title) {
            const duplicate = await this.service.findByTitle(data.title?.trim(), id);
            if (duplicate) {
                throw new common.ConflictException(`Tên lớp học "${data.title}" đã tồn tại trong hệ thống`);
            }
        }

        // Fetch existing to validate states correctly
        const existingClass = await this.service.findOne(id);
        const finalStatus = data.status !== undefined ? data.status : existingClass?.status;
        const finalStartDate = data.startDate !== undefined ? data.startDate : existingClass?.startDate;
        const finalEndDate = data.endDate !== undefined ? data.endDate : existingClass?.endDate;

        const requireDates = ['ready', 'active', 'finished'].includes(finalStatus);
        if (requireDates && (!finalStartDate || !finalEndDate)) {
            throw new common.BadRequestException('Thời gian khai giảng và kết thúc lớp học là bắt buộc đối với trạng thái Sẵn sàng/Đang diễn ra');
        }
        if (finalEndDate && new Date(finalEndDate) < new Date(new Date().toDateString())) {
            throw new common.BadRequestException('Ngày kết thúc không được là ngày trong quá khứ');
        }

        const requireTeacher = ['active', 'finished'].includes(finalStatus);
        const finalTeacherId = data.teacherId !== undefined ? data.teacherId : existingClass?.teacherId;
        if (requireTeacher && !finalTeacherId) {
            throw new common.BadRequestException('Giảng viên hướng dẫn là bắt buộc đối với trạng thái Đang diễn ra/Đã kết thúc');
        }

        // Convert scalar IDs → Prisma relation syntax (null = disconnect)
        const prismaData: any = {};
        if (data.title !== undefined) prismaData.title = data.title;
        if (data.status !== undefined) prismaData.status = data.status;
        if (data.startDate !== undefined) prismaData.startDate = data.startDate;
        if (data.endDate !== undefined) prismaData.endDate = data.endDate;
        if (data.sessionCount !== undefined) prismaData.sessionCount = data.sessionCount;

        // 'courseId' in data means user explicitly set/cleared it
        if ('courseId' in data) {
            prismaData.course = data.courseId ? { connect: { id: data.courseId } } : { disconnect: true };
        }
        if ('teacherId' in data) {
            prismaData.teacher = data.teacherId ? { connect: { id: data.teacherId } } : { disconnect: true };
        }
        if ('managerId' in data) {
            prismaData.manager = data.managerId ? { connect: { id: data.managerId } } : { disconnect: true };
        }

        return this.service.update(id, prismaData);
    }

    @common.Delete("/:id")
    @common.UseGuards(DefaultAuthGuard)
    async delete(@common.Req() req: any, @common.Param("id") id: string) {
        const user = req.user;
        const roles = user.roles as string[];

        // Only ADMIN and HEAD_STAFF can delete classes
        if (!roles.includes("ADMIN") && !roles.includes("HEAD_STAFF")) {
            throw new common.ForbiddenException("Chỉ Giáo vụ trưởng hoặc Admin mới có quyền xóa lớp học");
        }

        return this.service.delete(id);
    }

    @common.Post("/:id/validate-import")
    @common.UseGuards(DefaultAuthGuard)
    async validateImport(@common.Param("id") id: string, @common.Body() body: { identifiers: string[] }) {
        if (!body.identifiers || !Array.isArray(body.identifiers)) {
            throw new common.BadRequestException("Danh sách identifiers không hợp lệ");
        }
        return this.service.validateImport(id, body.identifiers);
    }

    @common.Post("/:id/enroll-bulk")
    @common.UseGuards(DefaultAuthGuard)
    async enrollBulk(@common.Param("id") id: string, @common.Body() body: { userIds: string[] }) {
        if (!body.userIds || !Array.isArray(body.userIds)) {
            throw new common.BadRequestException("Danh sách userIds không hợp lệ");
        }
        return this.service.enrollBulk(id, body.userIds);
    }
}
