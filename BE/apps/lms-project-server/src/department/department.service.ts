import { Injectable, BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const departments = await this.prisma.department.findMany({
      include: {
        head: {
          select: { id: true, username: true, fullName: true, avatar: true, email: true }
        },
        _count: {
          select: {
            teachers: true,
            courses: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return departments.map(d => ({
      id: d.id,
      code: d.code,
      name: d.name,
      description: d.description,
      head: d.head,
      headId: d.headId,
      teachersCount: d._count.teachers,
      coursesCount: d._count.courses,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        head: {
          select: { id: true, username: true, fullName: true, avatar: true, email: true, phoneNumber: true }
        },
        teachers: {
          select: { id: true, username: true, fullName: true, avatar: true, email: true, phoneNumber: true, status: true }
        },
        courses: {
          select: { id: true, title: true, coverImage: true, status: true, lessonCount: true }
        },
        _count: {
          select: { teachers: true, courses: true }
        }
      }
    });

    if (!department) {
      throw new NotFoundException("Không tìm thấy bộ môn");
    }

    return {
      ...department,
      teachersCount: department._count.teachers,
      coursesCount: department._count.courses,
    };
  }

  async create(data: { code: string; name: string; description?: string; headId?: string }) {
    const cleanCode = (data.code || "").trim().toUpperCase();
    if (!cleanCode) {
      throw new BadRequestException("Mã bộ môn là bắt buộc");
    }
    if (!data.name || !data.name.trim()) {
      throw new BadRequestException("Tên bộ môn là bắt buộc");
    }

    const existing = await this.prisma.department.findUnique({
      where: { code: cleanCode },
    });
    if (existing) {
      throw new ConflictException(`Mã bộ môn "${cleanCode}" đã tồn tại`);
    }

    const headId = data.headId || undefined;
    const department = await this.prisma.department.create({
      data: {
        code: cleanCode,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        head: headId ? { connect: { id: headId } } : undefined,
      },
      include: {
        head: {
          select: { id: true, username: true, fullName: true, avatar: true }
        }
      }
    });

    // If headId is provided, also attach that user to the department
    if (headId) {
      await this.prisma.user.update({
        where: { id: headId },
        data: { departmentId: department.id },
      });
    }

    return department;
  }

  async update(id: string, data: { code?: string; name?: string; description?: string; headId?: string | null }) {
    const current = await this.prisma.department.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException("Không tìm thấy bộ môn");
    }

    const updateData: any = {};
    if (data.code !== undefined) {
      const cleanCode = data.code.trim().toUpperCase();
      if (!cleanCode) throw new BadRequestException("Mã bộ môn không được để trống");
      const existing = await this.prisma.department.findUnique({ where: { code: cleanCode } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Mã bộ môn "${cleanCode}" đã được sử dụng`);
      }
      updateData.code = cleanCode;
    }

    if (data.name !== undefined) {
      if (!data.name.trim()) throw new BadRequestException("Tên bộ môn không được để trống");
      updateData.name = data.name.trim();
    }

    if (data.description !== undefined) {
      updateData.description = data.description ? data.description.trim() : null;
    }

    if (data.headId !== undefined) {
      if (data.headId) {
        updateData.head = { connect: { id: data.headId } };
        // also set departmentId for this teacher
        await this.prisma.user.update({
          where: { id: data.headId },
          data: { departmentId: id },
        });
      } else {
        updateData.head = { disconnect: true };
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: updateData,
      include: {
        head: {
          select: { id: true, username: true, fullName: true, avatar: true }
        }
      }
    });
  }

  async remove(id: string) {
    const current = await this.prisma.department.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException("Không tìm thấy bộ môn");
    }

    // Unassign teachers and courses before deleting
    await this.prisma.user.updateMany({
      where: { departmentId: id },
      data: { departmentId: null }
    });

    await this.prisma.course.updateMany({
      where: { departmentId: id },
      data: { departmentId: null }
    });

    return this.prisma.department.delete({
      where: { id },
    });
  }

  async addTeachers(departmentId: string, userIds: string[]) {
    if (!userIds || userIds.length === 0) {
      throw new BadRequestException("Danh sách giáo viên không được để trống");
    }

    await this.prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { departmentId },
    });

    return { success: true, count: userIds.length };
  }

  async removeTeacher(departmentId: string, teacherId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: teacherId } });
    if (!user || user.departmentId !== departmentId) {
      throw new BadRequestException("Giáo viên không thuộc bộ môn này");
    }

    // If teacher is also head of this department, disconnect head
    const dept = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (dept?.headId === teacherId) {
      await this.prisma.department.update({
        where: { id: departmentId },
        data: { head: { disconnect: true } }
      });
    }

    await this.prisma.user.update({
      where: { id: teacherId },
      data: { departmentId: null }
    });

    return { success: true };
  }
}
