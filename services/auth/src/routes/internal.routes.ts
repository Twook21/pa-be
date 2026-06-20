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


/**
 * Internal endpoint: POST /internal/validate-device
 * Validates that the device ID matches what was registered for this user at login.
 * Called by the attendance service before allowing check-in/check-out.
 *
 * Body: { userId: number, deviceId: string }
 * Response: { valid: boolean, reason?: string }
 */
router.post('/validate-device', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.headers['x-internal-service'] !== 'true') {
      res.status(403).json({ status: 'error', message: 'Forbidden', code: 'AUTH_FORBIDDEN' });
      return;
    }

    const { userId, deviceId } = req.body;

    if (!userId || !deviceId) {
      res.status(400).json({
        status: 'error',
        message: 'userId and deviceId are required',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: { deviceId: true, status: true },
    });

    if (!user) {
      res.status(200).json(formatSuccess('Device validation result', {
        valid: false,
        reason: 'User not found',
      }));
      return;
    }

    if (user.status !== 'active') {
      res.status(200).json(formatSuccess('Device validation result', {
        valid: false,
        reason: 'Account is inactive',
      }));
      return;
    }

    // If no device has ever been registered for this user, allow it
    // (backward compat: user might not have logged in since feature was added)
    if (!user.deviceId) {
      res.status(200).json(formatSuccess('Device validation result', { valid: true }));
      return;
    }

    const valid = user.deviceId === deviceId;

    res.status(200).json(formatSuccess('Device validation result', {
      valid,
      reason: valid ? undefined : 'Absensi hanya bisa dilakukan dari perangkat yang terakhir digunakan untuk login. Silakan login ulang dari perangkat ini.',
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
