import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany();
  }

  async findOne(id: string) {
    return this.prisma.category.findUnique({
      where: { id },
    });
  }

  async create(data: { name: string; description?: string }) {
    return this.prisma.category.create({
      data,
    });
  }

  async update(id: string, data: { name?: string; description?: string }) {
    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    // Should we remove relation from courses? The DB doesn't have cascade on this relation.
    // So removing category might throw error if it has courses.
    // Better to check or let Prisma throw error if there are courses attached.
    return this.prisma.category.delete({
      where: { id },
    });
  }
}
