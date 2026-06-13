import { PrismaClient } from '../db.js';
import {
  NotFoundError,
  ValidationError,
  AppError,
  type CreateActivityDTO,
  type PaginationParams,
} from '@fintap/shared';
import { notificationClient } from '../clients/notification-client.js';
import { attendanceClient } from '../clients/attendance-client.js';

const prisma = new PrismaClient();

export class ActivityService {
  /**
   * List activities with pagination.
   */
  async list(pagination: PaginationParams) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        skip,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      prisma.activity.count(),
    ]);

    return {
      data: activities.map(this.formatActivity),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single activity by ID.
   */
  async getById(id: number) {
    const activity = await prisma.activity.findUnique({ where: { id } });

    if (!activity) {
      throw new NotFoundError('Activity not found');
    }

    return this.formatActivity(activity);
  }

  /**
   * Create a new activity (admin only).
   * After creation, notifies all users via Notification Service.
   */
  async create(data: CreateActivityDTO, requestId?: string) {
    // Validate date format
    const dateObj = new Date(data.date);
    if (isNaN(dateObj.getTime())) {
      throw new ValidationError('Invalid date format', [
        { field: 'date', message: 'Date must be a valid ISO date (YYYY-MM-DD)' },
      ]);
    }

    // Check for duplicate date
    const existing = await prisma.activity.findUnique({
      where: { date: dateObj },
    });
    if (existing) {
      throw new ValidationError('Activity already exists on this date', [
        { field: 'date', message: 'An activity already exists on this date' },
      ]);
    }

    // Validate required fields
    this.validateTimeFields(data);

    const activity = await prisma.activity.create({
      data: {
        name: data.name,
        date: dateObj,
        description: data.description || null,
        photo: data.photo || null,
        checkInStart: data.checkInStart,
        checkInEnd: data.checkInEnd,
        checkOutStart: data.checkOutStart,
        checkOutEnd: data.checkOutEnd,
        checkInLatitude: data.checkInLatitude ?? null,
        checkInLongitude: data.checkInLongitude ?? null,
        checkOutLatitude: data.checkOutLatitude ?? null,
        checkOutLongitude: data.checkOutLongitude ?? null,
      },
    });

    // Notify all users about the new activity (fire and forget - don't block response)
    try {
      await notificationClient.notifyAllUsers(
        'activity_created',
        {
          activity_id: activity.id,
          activity_name: activity.name,
          activity_date: data.date,
          message: `Kegiatan baru: ${activity.name} pada ${data.date}`,
        },
        requestId
      );
    } catch {
      // Log but don't fail the creation if notification fails
    }

    return this.formatActivity(activity);
  }

  /**
   * Update an existing activity (admin only).
   */
  async update(id: number, data: Partial<CreateActivityDTO>) {
    const existing = await prisma.activity.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Activity not found');
    }

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.photo !== undefined) updateData.photo = data.photo || null;
    if (data.checkInStart !== undefined) updateData.checkInStart = data.checkInStart;
    if (data.checkInEnd !== undefined) updateData.checkInEnd = data.checkInEnd;
    if (data.checkOutStart !== undefined) updateData.checkOutStart = data.checkOutStart;
    if (data.checkOutEnd !== undefined) updateData.checkOutEnd = data.checkOutEnd;
    if (data.checkInLatitude !== undefined) updateData.checkInLatitude = data.checkInLatitude ?? null;
    if (data.checkInLongitude !== undefined) updateData.checkInLongitude = data.checkInLongitude ?? null;
    if (data.checkOutLatitude !== undefined) updateData.checkOutLatitude = data.checkOutLatitude ?? null;
    if (data.checkOutLongitude !== undefined) updateData.checkOutLongitude = data.checkOutLongitude ?? null;

    if (data.date !== undefined) {
      const dateObj = new Date(data.date);
      if (isNaN(dateObj.getTime())) {
        throw new ValidationError('Invalid date format', [
          { field: 'date', message: 'Date must be a valid ISO date (YYYY-MM-DD)' },
        ]);
      }

      // Check for duplicate date (exclude current activity)
      const duplicate = await prisma.activity.findFirst({
        where: { date: dateObj, id: { not: id } },
      });
      if (duplicate) {
        throw new ValidationError('Activity already exists on this date', [
          { field: 'date', message: 'An activity already exists on this date' },
        ]);
      }
      updateData.date = dateObj;
    }

    const activity = await prisma.activity.update({
      where: { id },
      data: updateData,
    });

    return this.formatActivity(activity);
  }

  /**
   * Delete an activity (admin only).
   * Checks attendance records before deletion.
   */
  async delete(id: number, requestId?: string) {
    const existing = await prisma.activity.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Activity not found');
    }

    // Check if there are attendance records linked to this activity
    try {
      const hasRecords = await attendanceClient.hasAttendanceRecords(id, requestId);
      if (hasRecords) {
        throw new AppError(
          'Cannot delete activity: attendance records exist for this activity',
          409,
          'ACTIVITY_HAS_ATTENDANCE'
        );
      }
    } catch (error) {
      // Re-throw our own errors
      if (error instanceof AppError) {
        throw error;
      }
      // If attendance service is unavailable, don't block deletion but log
      // Actually per requirement, we should verify - so throw if service is down
      throw error;
    }

    await prisma.activity.delete({ where: { id } });
  }

  /**
   * Get activity by date (internal endpoint for inter-service communication).
   * Returns null if no activity exists on the given date.
   */
  async getByDate(date: string) {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new ValidationError('Invalid date format', [
        { field: 'date', message: 'Date must be in YYYY-MM-DD format' },
      ]);
    }

    const activity = await prisma.activity.findUnique({
      where: { date: dateObj },
    });

    return activity ? this.formatActivity(activity) : null;
  }

  /**
   * Validate time fields (HH:MM format).
   */
  private validateTimeFields(data: CreateActivityDTO) {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const fields = ['checkInStart', 'checkInEnd', 'checkOutStart', 'checkOutEnd'] as const;
    const errors: Array<{ field: string; message: string }> = [];

    for (const field of fields) {
      if (!timeRegex.test(data[field])) {
        errors.push({ field, message: `${field} must be in HH:MM format` });
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid time format', errors);
    }
  }

  /**
   * Format a Prisma Activity model to the ActivityDTO response format.
   */
  private formatActivity(activity: any) {
    return {
      id: activity.id,
      name: activity.name,
      date: activity.date instanceof Date
        ? activity.date.toISOString().split('T')[0]
        : activity.date,
      description: activity.description,
      photo: activity.photo,
      checkInStart: activity.checkInStart,
      checkInEnd: activity.checkInEnd,
      checkOutStart: activity.checkOutStart,
      checkOutEnd: activity.checkOutEnd,
      checkInLatitude: activity.checkInLatitude ? Number(activity.checkInLatitude) : null,
      checkInLongitude: activity.checkInLongitude ? Number(activity.checkInLongitude) : null,
      checkOutLatitude: activity.checkOutLatitude ? Number(activity.checkOutLatitude) : null,
      checkOutLongitude: activity.checkOutLongitude ? Number(activity.checkOutLongitude) : null,
      createdAt: activity.createdAt instanceof Date
        ? activity.createdAt.toISOString()
        : activity.createdAt,
      updatedAt: activity.updatedAt instanceof Date
        ? activity.updatedAt.toISOString()
        : activity.updatedAt,
    };
  }
}

export const activityService = new ActivityService();
