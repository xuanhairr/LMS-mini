import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from "@nestjs/common";
import { DepartmentService } from "./department.service";
import { DefaultAuthGuard } from "../auth/defaultAuth.guard";

@Controller("departments")
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get()
  findAll() {
    return this.departmentService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.departmentService.findOne(id);
  }

  @Post()
  @UseGuards(DefaultAuthGuard)
  create(@Body() data: { code: string; name: string; description?: string; headId?: string }) {
    return this.departmentService.create(data);
  }

  @Patch(":id")
  @UseGuards(DefaultAuthGuard)
  update(
    @Param("id") id: string,
    @Body() data: { code?: string; name?: string; description?: string; headId?: string | null }
  ) {
    return this.departmentService.update(id, data);
  }

  @Delete(":id")
  @UseGuards(DefaultAuthGuard)
  remove(@Param("id") id: string) {
    return this.departmentService.remove(id);
  }

  @Post(":id/teachers")
  @UseGuards(DefaultAuthGuard)
  addTeachers(
    @Param("id") id: string,
    @Body() data: { userIds: string[] }
  ) {
    return this.departmentService.addTeachers(id, data.userIds);
  }

  @Delete(":id/teachers/:teacherId")
  @UseGuards(DefaultAuthGuard)
  removeTeacher(
    @Param("id") id: string,
    @Param("teacherId") teacherId: string
  ) {
    return this.departmentService.removeTeacher(id, teacherId);
  }
}
