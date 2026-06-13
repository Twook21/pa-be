import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if the request is an internal service call.
 * Internal requests must have the `x-internal-service` header set to "true".
 */
export function internalAuth(req: Request, res: Response, next: NextFunction): void {
  const internalHeader = req.headers['x-internal-service'];

  if (internalHeader !== 'true') {
    res.status(403).json({
      status: 'error',
      message: 'Forbidden: internal endpoint',
      code: 'INTERNAL_ONLY',
    });
    return;
  }

  next();
}

/**
 * Extracts user information from gateway-forwarded headers.
 * The API Gateway validates the JWT and passes user info via headers.
 */
export function extractUser(req: Request, _res: Response, next: NextFunction): void {
  const userId = req.headers['x-user-id'] as string | undefined;
  const userRole = req.headers['x-user-role'] as string | undefined;

  if (userId) {
    (req as any).userId = parseInt(userId, 10);
  }
  if (userRole) {
    (req as any).userRole = userRole;
  }

  next();
}

/**
 * Middleware to restrict access to admin-only endpoints.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const userRole = (req as any).userRole || req.headers['x-user-role'];

  if (userRole !== 'admin') {
    res.status(403).json({
      status: 'error',
      message: 'Forbidden: admin access required',
      code: 'AUTH_FORBIDDEN',
    });
    return;
  }

  next();
}
