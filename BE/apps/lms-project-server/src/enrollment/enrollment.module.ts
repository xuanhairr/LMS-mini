import { Module } from "@nestjs/common";
import { EnrollmentModuleBase } from "./base/enrollment.module.base";
import { EnrollmentService } from "./enrollment.service";
import { EnrollmentController } from "./enrollment.controller";
import { EnrollmentResolver } from "./enrollment.resolver";

import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [EnrollmentModuleBase, NotificationsModule],
  controllers: [EnrollmentController],
  providers: [EnrollmentService, EnrollmentResolver],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}
