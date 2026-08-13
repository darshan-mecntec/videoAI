import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AppError, ApiErrorResponseBody } from '../domain/types';

export interface RequestWithId extends Request {
  requestId?: string;
}

export function requestIdMiddleware(req: RequestWithId, res: Response, next: NextFunction): void {
  const reqId = (req.headers['x-request-id'] as string) || uuidv4();
  req.requestId = reqId;
  res.setHeader('X-Request-ID', reqId);
  next();
}

export function errorHandlerMiddleware(
  err: Error,
  req: RequestWithId,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const requestId = req.requestId || uuidv4();

  if (err instanceof AppError) {
    const responseBody: ApiErrorResponseBody = {
      error: {
        code: err.code,
        message: err.message,
        details: err.details || {},
        request_id: requestId,
      },
    };
    res.status(err.statusCode).json(responseBody);
    return;
  }

  const responseBody: ApiErrorResponseBody = {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
      details: {},
      request_id: requestId,
    },
  };
  res.status(500).json(responseBody);
}
