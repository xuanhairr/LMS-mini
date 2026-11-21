import { Controller, Get } from '@nestjs/common';
import { CLASS_STATUSES, COURSE_STATUSES, ENROLLMENT_STATUSES } from './constants';

@Controller('system')
export class SystemController {
    @Get('constants')
    getConstants() {
        return {
            classStatuses: CLASS_STATUSES,
            courseStatuses: COURSE_STATUSES,
            enrollmentStatuses: ENROLLMENT_STATUSES,
        };
    }
}
