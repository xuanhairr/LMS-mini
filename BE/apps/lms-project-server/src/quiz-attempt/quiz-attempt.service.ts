import { Injectable, BadRequestException } from "@nestjs/common";
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

  /**
   * Chấm điểm bài quiz an toàn tại Backend
   * So sánh câu trả lời của học viên với đáp án đúng trong CSDL
   */
  async submitAndGrade(studentId: string, quizId: string, answers: Record<string, number>) {
    const questions = await this.prisma.question.findMany({
      where: { quizId },
      orderBy: { order: "asc" },
    });

    if (!questions || questions.length === 0) {
      throw new BadRequestException("Không tìm thấy câu hỏi cho bài kiểm tra này");
    }

    let totalCorrect = 0;
    const questionResults = questions.map((q) => {
      const selected = answers ? answers[q.id] : undefined;
      const isCorrect = selected !== undefined && selected === q.correctAnswer;
      if (isCorrect) {
        totalCorrect++;
      }
      return {
        questionId: q.id,
        content: q.content,
        options: q.options,
        selectedAnswer: selected,
        correctAnswer: q.correctAnswer,
        isCorrect,
      };
    });

    const totalQuestions = questions.length;
    const score = Number(((totalCorrect / totalQuestions) * 10).toFixed(1));
    const passed = score >= 8.0;

    const attempt = await this.prisma.quizAttempt.create({
      data: {
        score,
        totalCorrect,
        passed,
        answers: answers || {},
        quiz: { connect: { id: quizId } },
        student: { connect: { id: studentId } },
      },
    });

    return {
      ...attempt,
      totalQuestions,
      results: questionResults,
    };
  }
}
