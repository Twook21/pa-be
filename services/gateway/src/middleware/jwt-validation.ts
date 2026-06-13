import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { formatError } from '@fintap/shared';
import { PUBLIC_ENDPOINTS } from '../config/routes.js';

interface JwtPayload {
  userId: number;
  role: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Checks if the current request matches a public endpoint definition.
 * Public endpoints skip JWT validation entirely.
 */
function isPublicEndpoint(method: string, path: string): boolean {
  const normalizedMethod = method.toUpperCase();

  return PUBLIC_ENDPOINTS.some((endpoint) => {
    const [endpointMethod, endpointPath] = endpoint.split(' ');

    if (normalizedMethod !== endpointMethod) {
      return false;
    }

    // Exact match or path starts with the endpoint path (for nested routes like /api-docs/*)
    return path === endpointPath || path.startsWith(`${endpointPath}/`);
  });
}

/**
 * JWT validation middleware for the API Gateway.
 *
 * 1. Checks if endpoint is public → skip validation
 * 2. Extracts token from Authorization: Bearer <token>
 * 3. Verifies signature with JWT_SECRET env var
 * 4. On success: injects x-user-id, x-user-role, x-user-email, x-request-id headers
 * 5. On failure: returns 401 with code AUTH_INVALID_TOKEN
 */
export function jwtValidation(req: Request, res: Response, next: NextFunction): void {
  // Skip validation for public endpoints
  if (isPublicEndpoint(req.method, req.path)) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json(formatError('Unauthorized', 'AUTH_INVALID_TOKEN'));
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    res.status(500).json(formatError('Server configuration error', 'INTERNAL_ERROR'));
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    // Inject user context headers for downstream services
    req.headers['x-user-id'] = String(decoded.userId);
    req.headers['x-user-role'] = decoded.role;
    req.headers['x-user-email'] = decoded.email;

    // Ensure request ID is present
    if (!req.headers['x-request-id']) {
      req.headers['x-request-id'] = uuidv4();
    }

    next();
  } catch (error) {
    // Covers invalid signature, expired token, malformed token
    res.status(401).json(formatError('Unauthorized', 'AUTH_INVALID_TOKEN'));
    return;
  }
}

/**
 * Admin role check middleware.
 * Must be used AFTER jwtValidation middleware.
 * Checks x-user-role header for "admin" value.
 * Returns 403 AUTH_FORBIDDEN if user is not an admin.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const role = req.headers['x-user-role'];

  if (role !== 'admin') {
    res.status(403).json(formatError('Forbidden', 'AUTH_FORBIDDEN'));
    return;
  }

  next();
}
