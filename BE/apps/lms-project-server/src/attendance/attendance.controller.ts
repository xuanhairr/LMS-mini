import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { BatchAttendanceDto } from './dto/attendance.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('class/:classId')
  async getByClass(@Param('classId') classId: string) {
    return this.attendanceService.getAttendanceByClass(classId);
  }

  @Get('class/:classId/session/:sessionNumber')
  async getBySession(
    @Param('classId') classId: string,
    @Param('sessionNumber') sessionNumber: string,
  ) {
    return this.attendanceService.getAttendanceBySession(classId, parseInt(sessionNumber, 10));
  }

  @Post('batch')
  async upsertBatch(@Body() dto: BatchAttendanceDto) {
    return this.attendanceService.upsertBatchAttendance(dto);
  }

  @Get('my/:studentId')
  async getMyAttendance(
    @Param('studentId') studentId: string,
    @Query('classId') classId?: string,
  ) {
    const where: any = { studentId };
    if (classId) where.classId = classId;
    
    return this.attendanceService.getAttendanceByStudent(where);
  }
}
