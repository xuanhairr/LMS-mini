import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpServer,
  HttpStatus,
} from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import { Prisma } from "@prisma/client";
import { Response } from "express";

export type ErrorCodesStatusMapping = {
  [key: string]: number;
};

/**
 * {@link PrismaClientExceptionFilter} handling {@link Prisma.PrismaClientKnownRequestError} exceptions.
 */
@Catch(Prisma?.PrismaClientKnownRequestError)
export class HttpExceptionFilter extends BaseExceptionFilter {
  /**
   * default error codes mapping
   *
   * Error codes definition for Prisma Client (Query Engine)
   * @see https://www.prisma.io/docs/reference/api-reference/error-reference#prisma-client-query-engine
   */
  private errorCodesStatusMapping: ErrorCodesStatusMapping = {
    P2000: HttpStatus.BAD_REQUEST,
    P2002: HttpStatus.CONFLICT,
    P2025: HttpStatus.NOT_FOUND,
  };

  /**
   * @param applicationRef
   */
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(applicationRef?: HttpServer) {
    super(applicationRef);
  }

  catch(exception: any, host: ArgumentsHost) {
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let errors: any[] = [];

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse() as any;
      message = res.message || exception.message;
      if (Array.isArray(res.message)) {
        message = "Validation failed";
        errors = res.message;
      }
    } else if (exception instanceof Prisma?.PrismaClientKnownRequestError) {
      statusCode = this.errorCodesStatusMapping[exception.code] || HttpStatus.BAD_REQUEST;
      if (exception.code === "P2002") {
        const target = (exception.meta as any)?.target;
        const fields = Array.isArray(target) ? target.join(", ") : (typeof target === 'string' ? target : "unique fields");
        message = `Another record with the requested (${fields}) already exists`;
      } else {
        message = `[${exception.code}]: ` + this.exceptionShortMessage(exception.message);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse = {
      success: false,
      statusCode,
      message,
      ...(errors.length > 0 ? { errors } : {}),
    };

    if (host.getType() === "http") {
      response.status(statusCode).json(errorResponse);
    }

    return errorResponse;
  }

  /**
   * @param exception
   * @returns short message for the exception
   */
  exceptionShortMessage(message: string): string {
    const shortMessage = message.substring(message.indexOf("→"));
    return shortMessage
      .substring(shortMessage.indexOf("\n"))
      .replace(/\n/g, "")
      .trim();
  }
}
