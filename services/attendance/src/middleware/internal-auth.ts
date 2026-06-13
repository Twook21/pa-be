import { Request, Response, NextFunction } from 'express';
import { AuthenticationError, AuthorizationError } from '@fintap/shared';

/**
 * Middleware that checks for internal service requests.
 * If x-internal-service header is "true", bypass any auth check.
 * Otherwise, ensure x-user-id header is present (injected by gateway).
 */
export function internalAuth(req: Request, _res: Response, next: NextFunction): void {
  const isInternal = req.headers['x-internal-service'] === 'true';

  if (isInternal) {
    return next();
  }

  const userId = req.headers['x-user-id'] as string | undefined;
  if (!userId) {
    return next(new AuthenticationError('Unauthorized'));
  }

  next();
}

/**
 * Middleware to require admin role.
 * Expects x-user-role header to be set by the gateway.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  const role = req.headers['x-user-role'] as string | undefined;

  if (role !== 'admin') {
    return next(new AuthorizationError('Admin access required'));
  }

  next();
}

/**
 * Helper to extract user identity from gateway-injected headers.
 */
export function extractUser(req: Request): { userId: number; role: string; email: string } {
  return {
    userId: parseInt(req.headers['x-user-id'] as string, 10),
    role: (req.headers['x-user-role'] as string) || 'user',
    email: (req.headers['x-user-email'] as string) || '',
  };
}
