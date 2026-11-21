import { Controller, Get, Post, Body, Param, Put, Delete } from "@nestjs/common";
import { CategoryService } from "./category.service";

@Controller("categories")
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  findAll() {
    return this.categoryService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.categoryService.findOne(id);
  }

  @Post()
  create(@Body() data: { name: string; description?: string }) {
    return this.categoryService.create(data);
  }

  @Put(":id")
  update(
    @Param("id") id: string,
    @Body() data: { name?: string; description?: string }
  ) {
    return this.categoryService.update(id, data);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.categoryService.remove(id);
  }
}
