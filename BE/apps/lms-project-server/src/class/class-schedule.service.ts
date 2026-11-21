import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// Định nghĩa các ca học chuẩn cũ bị xóa, giờ lấy từ DB

// Định nghĩa tên thứ trong tuần
export const DAY_LABELS: Record<number, string> = {
    2: "Thứ 2",
    3: "Thứ 3",
    4: "Thứ 4",
    5: "Thứ 5",
    6: "Thứ 6",
    7: "Thứ 7",
    8: "Chủ nhật",
};

@Injectable()
export class ClassScheduleService {
    constructor(protected readonly prisma: PrismaService) { }

    /**
     * Lấy danh sách tất cả ca học hợp lệ từ Database
     */
    async getShifts() {
        const shifts = await this.prisma.shift.findMany({
            where: { isActive: true },
            orderBy: { startTime: 'asc' }
        });
        return shifts.map(val => ({
            value: val.code,
            label: val.name,
            startTime: val.startTime,
            endTime: val.endTime,
        }));
    }

    /**
     * Lấy danh sách thứ trong tuần
     */
    getDays() {
        return Object.entries(DAY_LABELS).map(([key, label]) => ({
            value: parseInt(key),
            label,
        }));
    }

    /**
     * Tạo hoặc cập nhật lịch học cho một lớp
     */
    async upsert(classId: string, data: { dayOfWeek: number[]; shift: string; note?: string }) {
        // Validate dayOfWeek values
        const validDays = [2, 3, 4, 5, 6, 7, 8];
        const invalidDays = data.dayOfWeek.filter(d => !validDays.includes(d));
        if (invalidDays.length > 0) {
            throw new Error(`Giá trị thứ không hợp lệ: ${invalidDays.join(', ')}. Phải từ 2 (Thứ 2) đến 8 (Chủ nhật).`);
        }

        // Validate shift từ DB
        const shiftConfig = await this.prisma.shift.findUnique({ where: { code: data.shift } });
        if (!shiftConfig || !shiftConfig.isActive) {
            throw new Error(`Ca học không hợp lệ hoặc đã bị khóa: ${data.shift}.`);
        }

        return this.prisma.classSchedule.upsert({
            where: { classId },
            update: {
                dayOfWeek: data.dayOfWeek,
                shift: data.shift,
                startTime: shiftConfig.startTime,
                endTime: shiftConfig.endTime,
                note: data.note || null,
            },
            create: {
                classId,
                dayOfWeek: data.dayOfWeek,
                shift: data.shift,
                startTime: shiftConfig.startTime,
                endTime: shiftConfig.endTime,
                note: data.note || null,
            },
        });
    }

    /**
     * Lấy lịch học của một lớp
     */
    async findByClassId(classId: string) {
        return this.prisma.classSchedule.findUnique({
            where: { classId },
        });
    }

    /**
     * Xóa lịch học của một lớp
     */
    async deleteByClassId(classId: string) {
        return this.prisma.classSchedule.delete({
            where: { classId },
        });
    }
}
