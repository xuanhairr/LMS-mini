import { IsString, IsInt, IsDateString, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class AttendanceRecordDto {
  @IsString()
  studentId!: string;

  @IsString()
  status!: string; // 'present', 'absent', 'late', 'excused'

  @IsString()
  @IsOptional()
  note?: string;
}

export class BatchAttendanceDto {
  @IsString()
  classId!: string;

  @IsInt()
  sessionNumber!: number;

  @IsDateString()
  date!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records!: AttendanceRecordDto[];
}
