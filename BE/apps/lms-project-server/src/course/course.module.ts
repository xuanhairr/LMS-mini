import { Module } from "@nestjs/common";
import { CourseModuleBase } from "./base/course.module.base";
import { CourseService } from "./course.service";
import { CourseController } from "./course.controller";
import { CourseResolver } from "./course.resolver";
import { LessonModule } from "../lesson/lesson.module";

@Module({
  imports: [CourseModuleBase, LessonModule],
  controllers: [CourseController],
  providers: [CourseService, CourseResolver],
  exports: [CourseService],
})
export class CourseModule { }
