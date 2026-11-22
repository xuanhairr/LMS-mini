import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { UserModule } from "./user/user.module";
import { CourseModule } from "./course/course.module";
import { LessonModule } from "./lesson/lesson.module";
import { EnrollmentModule } from "./enrollment/enrollment.module";
import { ProgressModule } from "./progress/progress.module";
import { ClassModule } from "./class/class.module";
import { HealthModule } from "./health/health.module";
import { QuizModule } from "./quiz/quiz.module";
import { QuestionModule } from "./question/question.module";
import { VideoModule } from "./video/video.module";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { ShiftModule } from "./shift/shift.module";
import { QuizAttemptModule } from "./quiz-attempt/quiz-attempt.module";
import { SecretsManagerModule } from "./providers/secrets/secretsManager.module";
import { ServeStaticModule } from "@nestjs/serve-static";
import { ServeStaticOptionsService } from "./serveStaticOptions.service";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import * as nestAccessControl from "nest-access-control";
import { roles } from "./app.roles";
import { EmailModule } from "./email/email.module";
import { UploadModule } from "./upload/upload.module";
import { SchedulerModule } from "./scheduler/scheduler.module";
import { SystemModule } from "./system/system.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { CategoryModule } from "./category/category.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { GradingModule } from "./grading/grading.module";
import { DepartmentModule } from "./department/department.module";

@Module({
  controllers: [],
  imports: [
    ThrottlerModule.forRoot({
      errorMessage: "Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau ít phút.",
      throttlers: [
        {
          name: "default",
          ttl: 60000,
          limit: 120,
        },
      ],
    }),
    ScheduleModule.forRoot(),
    UserModule,
    CourseModule,
    LessonModule,
    EnrollmentModule,
    ClassModule,
    ProgressModule,
    QuizModule,
    QuestionModule,
    VideoModule,
    HealthModule,
    PrismaModule,
    AuthModule,
    ShiftModule,
    QuizAttemptModule,
    nestAccessControl.AccessControlModule.forRoles(roles),
    SecretsManagerModule,
    EmailModule,
    UploadModule,
    SchedulerModule,
    SystemModule,
    NotificationsModule,
    CategoryModule,
    AttendanceModule,
    GradingModule,
    DepartmentModule,
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRootAsync({
      useClass: ServeStaticOptionsService,
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      useFactory: (configService: ConfigService) => {
        const playground = configService.get("GRAPHQL_PLAYGROUND");
        const introspection = configService.get("GRAPHQL_INTROSPECTION");
        return {
          autoSchemaFile: "schema.graphql",
          sortSchema: true,
          playground,
          introspection: playground || introspection,
        };
      },
      inject: [ConfigService],
      imports: [ConfigModule],
    }),
  ],
  providers: [],
})
export class AppModule { }
