import * as common from "@nestjs/common";
import * as swagger from "@nestjs/swagger";
import { UserService } from "./user.service";
import { UserControllerBase } from "./base/user.controller.base";
import { DefaultAuthGuard } from "../auth/defaultAuth.guard";
import { UserFindManyArgs } from "./base/UserFindManyArgs";
import { plainToClass } from "class-transformer";
import { UserCreateInput } from "./base/UserCreateInput";
import { UserUpdateInput } from "./base/UserUpdateInput";
import { UserWhereUniqueInput } from "./base/UserWhereUniqueInput";
import * as bcrypt from "bcrypt";

@swagger.ApiTags("users")
@common.Controller("users")
export class UserController extends UserControllerBase {
  constructor(protected readonly service: UserService) {
    super(service);
  }

  /** Đổi mật khẩu với xác minh mật khẩu cũ */
  @common.UseGuards(DefaultAuthGuard)
  @common.Post("/change-password")
  async changePassword(
    @common.Body() body: { currentPassword?: string; newPassword?: string },
    @common.Req() req: any
  ) {
    const userId = req.user?.id;
    if (!userId) throw new common.UnauthorizedException("Phiên đăng nhập không hợp lệ");

    if (!body?.currentPassword || !body?.newPassword) {
      throw new common.BadRequestException("Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới");
    }

    if (body.newPassword.length < 6) {
      throw new common.BadRequestException("Mật khẩu mới phải có ít nhất 6 ký tự");
    }

    const dbUser = await this.service.user({ where: { id: userId } });
    if (!dbUser) throw new common.NotFoundException("Không tìm thấy người dùng");

    const isMatch = await bcrypt.compare(body.currentPassword, dbUser.password);
    if (!isMatch) throw new common.BadRequestException("Mật khẩu hiện tại không đúng");

    await this.service.updateUser({
      where: { id: userId },
      data: { password: body.newPassword, forcePasswordChange: false },
    });

    return { message: "Đổi mật khẩu thành công" };
  }

  @common.Get("/roles")
  async getRoles() {
    return this.service.findManyRoles({
      orderBy: { createdAt: "asc" }
    });
  }

  @common.UseGuards(DefaultAuthGuard)
  @common.Post()
  async createUser(
    @common.Body() data: UserCreateInput,
    @common.Req() req?: any
  ): Promise<any> {
    const user = req?.user;
    if (!user) {
      throw new common.UnauthorizedException("Phiên đăng nhập hết hạn hoặc không hợp lệ");
    }

    const roles = user.roles as string[];

    if (roles.includes("HEAD_STAFF") && !roles.includes("ADMIN")) {
      if (data.roles && data.roles.some(r => ["ADMIN", "HEAD_STAFF"].includes(r))) {
        throw new common.ForbiddenException("Giáo vụ trưởng chỉ có thể tạo Học viên, Giảng viên hoặc Giáo vụ");
      }
    } else if (roles.includes("STAFF") && !roles.includes("ADMIN") && !roles.includes("HEAD_STAFF")) {
      if (data.roles && data.roles.some(r => r !== "STUDENT")) {
        throw new common.ForbiddenException("Giáo vụ chỉ có thể tạo Học viên (Sinh viên)");
      }
    } else if (!roles.includes("ADMIN") && !roles.includes("HEAD_STAFF") && !roles.includes("STAFF")) {
      throw new common.ForbiddenException("Bạn không có quyền tạo người dùng");
    }

    try {
      return await super.createUser({
        ...data,
        creatorId: user.id,
        updaterId: user.id
      } as any);
    } catch (error: any) {
      if (error.message?.includes("User_username_key")) {
        throw new common.ConflictException("Tên đăng nhập này đã tồn tại");
      }
      if (error.message?.includes("User_email_key")) {
        throw new common.ConflictException("Email này đã được sử dụng bởi người dùng khác");
      }
      throw error;
    }
  }

  @common.UseGuards(DefaultAuthGuard)
  @common.Get()
  async users(@common.Req() req: any): Promise<any> {
    const user = req.user;
    const roles = user.roles as string[];

    const args = plainToClass(UserFindManyArgs, req.query);

    if (roles.includes("HEAD_STAFF") && !roles.includes("ADMIN")) {
      const allowedRoles = ["STUDENT", "TEACHER", "STAFF", "HEAD_STAFF"];
      if (args.where?.roles?.has) {
        if (!allowedRoles.includes(args.where.roles.has)) {
          args.where.roles = { hasSome: ["__NONE__"] };
        }
      } else if (args.where?.roles?.hasSome) {
        args.where.roles.hasSome = args.where.roles.hasSome.filter(r => allowedRoles.includes(r));
        if (args.where.roles.hasSome.length === 0) args.where.roles.hasSome = ["__NONE__"];
      } else {
        args.where = { ...args.where, roles: { hasSome: allowedRoles } };
      }
    } else if ((roles.includes("STAFF") || roles.includes("TEACHER")) && !roles.includes("ADMIN") && !roles.includes("HEAD_STAFF")) {
      const allowedRoles = ["STUDENT", "TEACHER", "STAFF", "HEAD_STAFF"];
      if (args.where?.roles?.has) {
        if (!allowedRoles.includes(args.where.roles.has)) {
          args.where.roles = { hasSome: ["__NONE__"] };
        }
      } else if (args.where?.roles?.hasSome) {
        args.where.roles.hasSome = args.where.roles.hasSome.filter(r => allowedRoles.includes(r));
        if (args.where.roles.hasSome.length === 0) args.where.roles.hasSome = ["__NONE__"];
      } else {
        args.where = { ...args.where, roles: { hasSome: allowedRoles } };
      }
    } else if (!roles.includes("ADMIN") && !roles.includes("HEAD_STAFF") && !roles.includes("STAFF") && !roles.includes("TEACHER")) {
      throw new common.ForbiddenException("Bạn không có quyền xem danh sách người dùng");
    }

    // Lấy dữ liệu và đếm tổng số bản ghi song song
    const [data, total] = await Promise.all([
      this.service.users({
        ...args,
        select: {
          createdAt: true,
          email: true,
          fullName: true,
          id: true,
          roles: true,
          updatedAt: true,
          username: true,
          status: true,
          avatar: true,
          forcePasswordChange: true,
          phoneNumber: true,
          creator: {
            select: {
              username: true,
              fullName: true
            }
          },
          updater: {
            select: {
              username: true,
              fullName: true
            }
          }
        },
      }),
      this.service.count({ where: args.where }),
    ]);

    return {
      data: {
        items: data,
        total,
        take: args.take || 10,
        skip: args.skip || 0,
      }
    };
  }

  @common.UseGuards(DefaultAuthGuard)
  @common.Patch("/:id")
  async updateUser(
    @common.Param() params: UserWhereUniqueInput,
    @common.Body() data: UserUpdateInput,
    @common.Req() req?: any
  ): Promise<any | null> {
    const user = req?.user;
    if (!user) {
      throw new common.UnauthorizedException("Phiên đăng nhập hết hạn hoặc không hợp lệ");
    }
    const roles = user.roles as string[];

    // 1. Always allow self-update
    if (user.id === params.id) {
      // However, don't let them upgrade their own roles if not admin
      if (data.roles && !roles.includes("ADMIN")) {
        throw new common.ForbiddenException("Bạn không có quyền tự thay đổi vai trò của mình");
      }
    } else {
      // 2. Role-based restrictions for non-self updates
      if (roles.includes("HEAD_STAFF") && !roles.includes("ADMIN")) {
        const targetUser = await this.service.user({ where: params });
        if (targetUser && targetUser.roles.some(r => ["ADMIN", "HEAD_STAFF"].includes(r))) {
          throw new common.ForbiddenException("Giáo vụ trưởng không có quyền chỉnh sửa Admin hoặc Giáo vụ trưởng khác");
        }
      } else if (roles.includes("STAFF") && !roles.includes("ADMIN") && !roles.includes("HEAD_STAFF")) {
        const targetUser = await this.service.user({ where: params });
        if (targetUser && targetUser.roles.some(r => ["ADMIN", "HEAD_STAFF", "STAFF"].includes(r))) {
          throw new common.ForbiddenException("Giáo vụ thường không có quyền chỉnh sửa nhân sự khác hoặc admin");
        }
      } else if (!roles.includes("ADMIN") && !roles.includes("HEAD_STAFF") && !roles.includes("STAFF")) {
        // Teacher or Student trying to edit someone else
        throw new common.ForbiddenException("Bạn không có quyền chỉnh sửa người dùng khác");
      }
    }

    try {
      return await super.updateUser(params, {
        ...data,
        updaterId: user.id
      } as any);
    } catch (error: any) {
      if (error.message?.includes("User_username_key")) {
        throw new common.ConflictException("Tên đăng nhập này đã tồn tại");
      }
      if (error.message?.includes("User_email_key")) {
        throw new common.ConflictException("Email này đã được sử dụng bởi người dùng khác");
      }
      throw error;
    }
  }

  @common.UseGuards(DefaultAuthGuard)
  @common.Delete("/:id")
  async deleteUser(
    @common.Param() params: UserWhereUniqueInput,
    @common.Req() req?: any
  ): Promise<any | null> {
    const user = req?.user;
    if (!user) {
      throw new common.UnauthorizedException("Phiên đăng nhập hết hạn hoặc không hợp lệ");
    }
    const roles = user.roles as string[];

    // 1. Always allow self-delete (though usually not recommended, keeping consistency)
    if (user.id !== params.id) {
      if (roles.includes("HEAD_STAFF") && !roles.includes("ADMIN")) {
        const targetUser = await this.service.user({ where: params });
        if (targetUser && targetUser.roles.some(r => ["ADMIN", "HEAD_STAFF"].includes(r))) {
          throw new common.ForbiddenException("Giáo vụ trưởng không có quyền xóa nhân sự cấp cao hoặc admin");
        }
      } else if (roles.includes("STAFF") && !roles.includes("ADMIN") && !roles.includes("HEAD_STAFF")) {
        const targetUser = await this.service.user({ where: params });
        if (targetUser && targetUser.roles.some(r => ["ADMIN", "HEAD_STAFF", "STAFF"].includes(r))) {
          throw new common.ForbiddenException("Giáo vụ thường không có quyền xóa nhân sự hoặc admin");
        }
      } else if (!roles.includes("ADMIN")) {
        throw new common.ForbiddenException("Bạn không có quyền xóa người dùng khác");
      }
    }

    return super.deleteUser(params);
  }
}
