import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UserServiceBase } from "./base/user.service.base";
import { User as PrismaUser, Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";

@Injectable()
export class UserService extends UserServiceBase {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  async findByUsername(username: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async findByUsernameOrEmail(identifier: string): Promise<PrismaUser | null> {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier },
        ],
      },
    });
  }

  async findByEmail(email: string): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({
      where: { email: email },
    });
  }

  async createUser(args: Prisma.UserCreateArgs): Promise<PrismaUser> {
    const password = await bcrypt.hash(args.data.password, 10);
    return this.prisma.user.create({
      ...args,
      data: {
        ...args.data,
        password,
      },
    });
  }

  async updateUser(args: Prisma.UserUpdateArgs): Promise<PrismaUser> {
    if (args.data.password) {
      args.data.password = await bcrypt.hash(args.data.password as string, 10);
    }
    return super.updateUser(args);
  }

  async findManyRoles(args: Prisma.RoleFindManyArgs): Promise<any[]> {
    return this.prisma.role.findMany(args);
  }
}
