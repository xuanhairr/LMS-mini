import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BatchAttendanceDto } from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getAttendanceByClass(classId: string) {
    return this.prisma.attendance.findMany({
      where: { classId },
      include: {
        student: {
          select: { id: true, fullName: true, username: true }
        }
      },
      orderBy: { sessionNumber: 'asc' }
    });
  }

  async getAttendanceBySession(classId: string, sessionNumber: number) {
    return this.prisma.attendance.findMany({
      where: { classId, sessionNumber },
      include: {
        student: {
          select: { id: true, fullName: true, username: true }
        }
      }
    });
  }

  async getAttendanceByStudent(where: any) {
    return this.prisma.attendance.findMany({
      where,
      include: {
        class: {
          select: { id: true, title: true, course: { select: { title: true, category: true } } }
        }
      },
      orderBy: { date: 'desc' }
    });
  }

  async upsertBatchAttendance(dto: BatchAttendanceDto) {
    const { classId, sessionNumber, date, records } = dto;
    const sessionDate = new Date(date);

    // Xử lý từng record để upsert
    const results = await Promise.all(
      records.map(record => 
        this.prisma.attendance.upsert({
          where: {
            classId_studentId_sessionNumber: {
              classId,
              studentId: record.studentId,
              sessionNumber,
            }
          },
          update: {
            status: record.status,
            note: record.note,
            date: sessionDate,
          },
          create: {
            classId,
            studentId: record.studentId,
            sessionNumber,
            date: sessionDate,
            status: record.status,
            note: record.note,
          }
        })
      )
    );

    return results;
  }
}
