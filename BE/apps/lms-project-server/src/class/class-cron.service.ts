import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ClassCronService {
    private readonly logger = new Logger(ClassCronService.name);

    constructor(private readonly prisma: PrismaService) {}

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleClassStatusTransitions() {
        this.logger.log("Running daily background job to transition class statuses...");
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        try {
            // Quy tắc 1: Tự động Khai giảng
            // Từ "Sẵn sàng" (ready) -> "Đang diễn ra" (active)
            // Khi hôm nay đã lớn hơn hoặc bằng ngày khai giảng
            const readyToActive = await this.prisma.class.updateMany({
                where: {
                    status: "ready",
                    startDate: {
                        lte: today,
                    },
                    // Không tự động khai giảng nếu lớp chưa được xếp giảng viên
                    teacherId: {
                        not: null
                    }
                },
                data: {
                    status: "active",
                },
            });
            if (readyToActive.count > 0) {
                this.logger.log(`Transited ${readyToActive.count} classes from "ready" to "active" (Khai giảng).`);
            }

            // Quy tắc 2: Tự động Bế giảng
            // Từ "Đang diễn ra" (active) -> "Đã kết thúc" (finished)
            // Cho phép thời gian đệm (buffer) 2 ngày sau khi kết thúc mới chính thức đóng
            const finishThresholdDate = new Date(today);
            finishThresholdDate.setDate(finishThresholdDate.getDate() - 2);

            const activeToFinished = await this.prisma.class.updateMany({
                where: {
                    status: "active",
                    endDate: {
                        lt: finishThresholdDate,
                    },
                },
                data: {
                    status: "finished",
                },
            });
            if (activeToFinished.count > 0) {
                this.logger.log(`Transited ${activeToFinished.count} classes from "active" to "finished" (Bế giảng).`);
            }
            
            this.logger.log("Daily class status transitions completed successfully.");
        } catch (error) {
            this.logger.error("Error running daily class status transitions.", error);
        }
    }
}
