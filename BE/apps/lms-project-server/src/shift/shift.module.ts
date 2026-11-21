import { Module, OnModuleInit } from '@nestjs/common';
import { ShiftService } from './shift.service';
import { ShiftController } from './shift.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [ShiftController],
    providers: [ShiftService],
    exports: [ShiftService],
})
export class ShiftModule implements OnModuleInit {
    constructor(private readonly shiftService: ShiftService) {}

    async onModuleInit() {
        await this.shiftService.seedInitialShifts();
    }
}
