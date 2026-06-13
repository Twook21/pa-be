import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '../db.js';
import { formatSuccess, ValidationError } from '@fintap/shared';
import { internalAuth } from '../middleware/internal-auth.js';

const router = Router();
const prisma = new PrismaClient();

// All internal routes require the x-internal-service header
router.use(internalAuth);

/**
 * GET /internal/attendances
 * Query params: user_id, date_start, date_end, activity_id
 * Returns matching attendance records for inter-service communication.
 * Used by Request Service and Activity Service.
 */
router.get('/attendances', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.query.user_id ? parseInt(req.query.user_id as string, 10) : undefined;
    const dateStart = req.query.date_start as string | undefined;
    const dateEnd = req.query.date_end as string | undefined;
    const activityId = req.query.activity_id ? parseInt(req.query.activity_id as string, 10) : undefined;

    // Build where clause
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (dateStart || dateEnd) {
      where.date = {};
      if (dateStart) where.date.gte = new Date(dateStart);
      if (dateEnd) where.date.lte = new Date(dateEnd);
    }

    if (activityId) {
      where.activityId = activityId;
    }

    const records = await prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const data = records.map((record: any) => ({
      id: record.id,
      userId: record.userId,
      date: record.date instanceof Date ? record.date.toISOString().split('T')[0] : String(record.date),
      checkInTime: record.checkInTime ? formatTime(record.checkInTime) : null,
      checkOutTime: record.checkOutTime ? formatTime(record.checkOutTime) : null,
      checkInPhoto: record.checkInPhoto,
      checkOutPhoto: record.checkOutPhoto,
      checkInLatitude: record.checkInLatitude ? Number(record.checkInLatitude) : null,
      checkInLongitude: record.checkInLongitude ? Number(record.checkInLongitude) : null,
      checkOutLatitude: record.checkOutLatitude ? Number(record.checkOutLatitude) : null,
      checkOutLongitude: record.checkOutLongitude ? Number(record.checkOutLongitude) : null,
      status: record.status,
      notes: record.notes,
      activityId: record.activityId,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    }));

    res.status(200).json(formatSuccess('Attendance records retrieved', data));
  } catch (error) {
    next(error);
  }
});

function formatTime(time: Date | string): string {
  if (time instanceof Date) {
    return time.toISOString().split('T')[1].split('.')[0];
  }
  return String(time);
}

/**
 * PUT /internal/attendances/:id/status
 * Update attendance status (used by Admin Dashboard).
 * Body: { status: "present" | "late" | "absent" | "sakit" | "cuti" | "dinas_luar" }
 */
router.put('/attendances/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new ValidationError('Invalid attendance ID', [
        { field: 'id', message: 'ID must be a valid number' },
      ]);
    }

    const { status } = req.body;
    const validStatuses = ['present', 'late', 'absent', 'sakit', 'cuti', 'dinas_luar'];
    if (!status || !validStatuses.includes(status)) {
      throw new ValidationError('Invalid status', [
        { field: 'status', message: `Status must be one of: ${validStatuses.join(', ')}` },
      ]);
    }

    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Attendance record not found', code: 'NOT_FOUND' });
      return;
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data: { status },
    });

    const data = {
      id: updated.id,
      userId: updated.userId,
      date: updated.date instanceof Date ? updated.date.toISOString().split('T')[0] : String(updated.date),
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    };

    res.status(200).json(formatSuccess('Attendance status updated', data));
  } catch (error) {
    next(error);
  }
});

export default router;
