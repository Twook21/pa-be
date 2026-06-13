import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '../db.js';
import { formatSuccess } from '@fintap/shared';
import * as userService from '../services/user.service.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * Internal endpoint: GET /internal/users
 * Returns list of active users.
 * Supports query filter: status, role.
 */
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify internal service header
    if (req.headers['x-internal-service'] !== 'true') {
      res.status(403).json({ status: 'error', message: 'Forbidden', code: 'AUTH_FORBIDDEN' });
      return;
    }

    const status = req.query.status as string | undefined;
    const role = req.query.role as string | undefined;

    const where: any = {};
    if (status) where.status = status;
    if (role) where.role = role;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        fcmToken: true,
        status: true,
        role: true,
      },
    });

    res.status(200).json(formatSuccess('Users retrieved', users));
  } catch (error) {
    next(error);
  }
});

/**
 * Internal endpoint: GET /internal/users/:id
 * Returns user data without password for inter-service communication.
 * Only accessible by requests with x-internal-service: "true" header.
 */
router.get('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify internal service header
    if (req.headers['x-internal-service'] !== 'true') {
      res.status(403).json({ status: 'error', message: 'Forbidden', code: 'AUTH_FORBIDDEN' });
      return;
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ status: 'error', message: 'Invalid user ID', code: 'VALIDATION_ERROR' });
      return;
    }

    const user = await userService.getUserByIdInternal(id);
    res.status(200).json(formatSuccess('User retrieved', user));
  } catch (error) {
    next(error);
  }
});

export default router;
