import * as common from "@nestjs/common";
import * as swagger from "@nestjs/swagger";
import { ClassScheduleService } from "./class-schedule.service";
import { DefaultAuthGuard } from "../auth/defaultAuth.guard";

@swagger.ApiTags("class-schedules")
@common.Controller("class-schedules")
export class ClassScheduleController {
    constructor(private readonly scheduleService: ClassScheduleService) { }

    /**
     * GET /class-schedules/meta - Lấy danh sách ca học và thứ trong tuần hợp lệ để hiển thị trên UI
     */
    @common.Get("meta")
    async getMeta() {
        return {
            shifts: await this.scheduleService.getShifts(),
            days: this.scheduleService.getDays(),
        };
    }

    /**
     * GET /class-schedules/:classId - Lấy lịch học của một lớp
     */
    @common.Get(":classId")
    @common.UseGuards(DefaultAuthGuard)
    async findOne(@common.Param("classId") classId: string) {
        return this.scheduleService.findByClassId(classId);
    }

    /**
     * POST /class-schedules - Tạo hoặc cập nhật lịch học
     * Body: { classId, dayOfWeek: number[], shift: string, note?: string }
     */
    @common.Post()
    @common.UseGuards(DefaultAuthGuard)
    async upsert(@common.Body() body: any) {
        const { classId, dayOfWeek, shift, note } = body;

        if (!classId) throw new common.BadRequestException("classId là bắt buộc");
        if (!Array.isArray(dayOfWeek) || dayOfWeek.length === 0) throw new common.BadRequestException("dayOfWeek phải là mảng chứa ít nhất 1 thứ trong tuần");
        if (!shift) throw new common.BadRequestException("shift (ca học) là bắt buộc");

        try {
            return await this.scheduleService.upsert(classId, { dayOfWeek, shift, note });
        } catch (err: any) {
            throw new common.BadRequestException(err.message);
        }
    }

    /**
     * DELETE /class-schedules/:classId - Xóa lịch học
     */
    @common.Delete(":classId")
    @common.UseGuards(DefaultAuthGuard)
    async delete(@common.Param("classId") classId: string) {
        const existing = await this.scheduleService.findByClassId(classId);
        if (!existing) throw new common.NotFoundException("Lịch học không tồn tại");
        return this.scheduleService.deleteByClassId(classId);
    }
}
