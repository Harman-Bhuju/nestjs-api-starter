import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import pino from 'pino';
import { AppException } from './app-exception';

@Catch()
export class ExceptionHandler implements ExceptionFilter {
  constructor(private readonly logger: pino.Logger) {}

  catch(exception: Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode: number;
    let message: string | object = exception.message;

    if (exception instanceof AppException) {
      statusCode = exception.statusCode;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      message = typeof res === 'string' ? res : ((res as any).message ?? res);
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    this.logger.error(
      { statusCode, name: exception.name, stack: exception.stack },
      exception.message,
    );

    response.status(statusCode).json({
      statusCode,
      message,
      // safe - hides internal file paths from hackers in production
      stack:
        process.env.NODE_ENV === 'production' ? undefined : exception.stack,
    });
  }
}
