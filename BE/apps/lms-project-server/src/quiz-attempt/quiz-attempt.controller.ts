import * as common from "@nestjs/common";
import * as swagger from "@nestjs/swagger";
import { QuizAttemptService } from "./quiz-attempt.service";
import { QuizAttempt } from "@prisma/client";
import { DefaultAuthGuard } from "../auth/defaultAuth.guard";

@swagger.ApiTags("quiz-attempts")
@common.Controller("quiz-attempts")
export class QuizAttemptController {
  constructor(protected readonly service: QuizAttemptService) {}

  @common.Post()
  @common.UseGuards(DefaultAuthGuard)
  async create(
    @common.Req() request: any,
    @common.Body() data: any
  ): Promise<any> {
    const user = request.user;
    const { quizId, answers } = data;
    
    if (!quizId) {
      throw new common.BadRequestException("quizId là bắt buộc");
    }

    return this.service.submitAndGrade(user.id, quizId, answers || {});
  }

  @common.Get()
  @common.UseGuards(DefaultAuthGuard)
  async findMany(
    @common.Req() request: any,
    @common.Query() query: any
  ): Promise<QuizAttempt[]> {
    const user = request.user;
    const where: any = {
      studentId: user.id,
    };

    if (query.quizId) {
      where.quizId = query.quizId;
    }

    return this.service.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }
}
