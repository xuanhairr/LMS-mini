import { Module } from "@nestjs/common";
import { ClassService } from "./class.service";
import { ClassController } from "./class.controller";
import { ClassScheduleService } from "./class-schedule.service";
import { ClassScheduleController } from "./class-schedule.controller";
import { ClassCronService } from "./class-cron.service";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
    imports: [PrismaModule, NotificationsModule],
    providers: [ClassService, ClassScheduleService, ClassCronService],
    controllers: [ClassController, ClassScheduleController],
    exports: [ClassService, ClassScheduleService],
})
export class ClassModule { }
