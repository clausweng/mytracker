import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  type HttpExceptionBody,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Consistent error envelope for every failure: `{ statusCode, message, error }`.
 */
export interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

function isHttpExceptionBody(value: unknown): value is HttpExceptionBody {
  return typeof value === 'object' && value !== null && 'message' in value;
}

/**
 * Catches every thrown error, normalising `HttpException`s and unknown errors
 * into the same JSON shape so clients never receive a stack trace.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const { message, error } = this.describe(exception, status);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.url} -> ${status}`, exception instanceof Error ? exception.stack : String(exception));
    }

    const body: ErrorResponseBody = {
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }

  private describe(exception: unknown, status: number): { message: string | string[]; error: string } {
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        return { message: payload, error: exception.name };
      }
      if (isHttpExceptionBody(payload)) {
        return {
          message: payload.message,
          error: typeof payload.error === 'string' ? payload.error : exception.name,
        };
      }
    }

    return {
      message: status === HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal server error' : 'Request failed',
      error: 'InternalServerError',
    };
  }
}
