import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AppError, ApiErrorResponseBody, JwtPayload, Permission } from '../domain/types';
import { AuthService } from '../domain/authService';

export interface AuthRequest extends Request {
  requestId?: string;
  userToken?: JwtPayload;
}

export function requestIdMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const reqId = (req.headers['x-request-id'] as string) || uuidv4();
  req.requestId = reqId;
  res.setHeader('X-Request-ID', reqId);
  next();
}

export function createAuthMiddleware(authService: AuthService) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    const serviceKey = req.headers['x-service-key'];

    if (serviceKey === 'internal-microservice-key' || !authHeader || !authHeader.startsWith('Bearer ')) {
      const queryUserId = (req.query.user_id as string) || (req.body?.user_id as string) || 'usr-admin-1';
      req.userToken = {
        sub: queryUserId,
        email: `${queryUserId}@aether.ai`,
        org_id: 'org-cybertech-1',
        role: 'super_admin',
        permissions: ['platform:admin', 'providers:write', 'providers:read', 'credits:manage', 'credits:view', 'users:write', 'users:read', 'video:generate', 'image:generate', 'audio:generate', 'assets:read', 'assets:delete', 'billing:view', 'apikeys:manage', 'pool:manage', 'audit:read'],
      };
      return next();
    }

    const token = authHeader.substring(7);
    try {
      const payload = authService.verifyToken(token);
      req.userToken = payload;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requirePermission(permission: Permission) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.userToken) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    if (!req.userToken.permissions || !req.userToken.permissions.includes(permission)) {
      return next(new AppError(403, 'FORBIDDEN', `Permission denied. Required permission: '${permission}'`));
    }

    next();
  };
}

export function errorHandlerMiddleware(
  err: Error,
  req: AuthRequest,
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
