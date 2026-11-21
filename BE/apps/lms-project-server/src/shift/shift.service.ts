import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShiftService {
    constructor(private prisma: PrismaService) {}

    async create(data: any) {
        return this.prisma.shift.create({ data });
    }

    async findAll(args?: any) {
        return this.prisma.shift.findMany(args);
    }

    async findOne(id: string) {
        return this.prisma.shift.findUnique({ where: { id } });
    }

    async update(id: string, data: any) {
        return this.prisma.shift.update({
            where: { id },
            data,
        });
    }

    async remove(id: string) {
        return this.prisma.shift.delete({ where: { id } });
    }

    async seedInitialShifts() {
        const existing = await this.prisma.shift.count();
        if (existing === 0) {
            const defaultShifts = [
                { code: "CA1", name: "Ca 1", startTime: "06:30", endTime: "08:30" },
                { code: "CA2", name: "Ca 2", startTime: "08:30", endTime: "10:30" },
                { code: "CA3", name: "Ca 3", startTime: "10:30", endTime: "12:30" },
                { code: "CA4", name: "Ca 4", startTime: "13:00", endTime: "15:00" },
                { code: "CA5", name: "Ca 5", startTime: "15:00", endTime: "17:00" },
                { code: "CA6", name: "Ca 6", startTime: "17:30", endTime: "19:30" },
                { code: "CA7", name: "Ca 7", startTime: "19:30", endTime: "21:30" },
            ];
            await this.prisma.shift.createMany({ data: defaultShifts });
            console.log("Seeded default shifts successfully.");
        }
    }
}
