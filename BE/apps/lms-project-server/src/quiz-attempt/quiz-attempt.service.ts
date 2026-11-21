import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma, QuizAttempt } from "@prisma/client";

@Injectable()
export class QuizAttemptService {
  constructor(protected readonly prisma: PrismaService) {}

  async create(args: Prisma.QuizAttemptCreateArgs): Promise<QuizAttempt> {
    return this.prisma.quizAttempt.create(args);
  }

  async findMany(args: Prisma.QuizAttemptFindManyArgs): Promise<QuizAttempt[]> {
    return this.prisma.quizAttempt.findMany(args);
  }

  async findUnique(args: Prisma.QuizAttemptFindUniqueArgs): Promise<QuizAttempt | null> {
    return this.prisma.quizAttempt.findUnique(args);
  }
}
