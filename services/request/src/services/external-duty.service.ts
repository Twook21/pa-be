import { PrismaClient } from '../db.js';
import {
  NotFoundError,
  ValidationError,
  type CreateExternalDutyDTO,
  type PaginationParams,
} from '@fintap/shared';
import { configClient } from '../clients/config-client.js';
import { attendanceClient } from '../clients/attendance-client.js';
import { notificationClient } from '../clients/notification-client.js';
import { authClient } from '../clients/auth-client.js';

const prisma = new PrismaClient();

export class ExternalDutyService {
  /**
   * List external duties with pagination.
   * Admin sees all, user sees only their own.
   */
  async list(pagination: PaginationParams, userId: number, userRole: string) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where = userRole === 'admin' ? {} : { userId };

    const [duties, total] = await Promise.all([
      prisma.externalDuty.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.externalDuty.count({ where }),
    ]);

    const formattedDuties = await Promise.all(
      duties.map(async (duty: any) => {
        const formatted = this.formatExternalDuty(duty) as any;
        formatted.user = await authClient.getUser(duty.userId);
        if (duty.approvedBy) {
          formatted.approver = await authClient.getUser(duty.approvedBy);
        }
        return formatted;
      })
    );

    return {
      data: formattedDuties,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single external duty by ID.
   */
  async getById(id: number, userId: number, userRole: string) {
    const duty = await prisma.externalDuty.findUnique({ where: { id } });

    if (!duty) {
      throw new NotFoundError('External duty not found');
    }

    // Non-admin users can only view their own duties
    if (userRole !== 'admin' && duty.userId !== userId) {
      throw new NotFoundError('External duty not found');
    }

    const formatted = this.formatExternalDuty(duty) as any;
    formatted.user = await authClient.getUser(duty.userId);
    if (duty.approvedBy) {
      formatted.approver = await authClient.getUser(duty.approvedBy);
    }
    return formatted;
  }

  /**
   * Create a new external duty request.
   * Checks if the date is a holiday via Config Service.
   */
  async create(data: CreateExternalDutyDTO, userId: number, requestId?: string) {
    // Validate date
    const date = new Date(data.date);
    if (isNaN(date.getTime())) {
      throw new ValidationError('Invalid date format', [
        { field: 'date', message: 'Date must be a valid date (YYYY-MM-DD)' },
      ]);
    }

    // Validate required fields
    if (!data.location || data.location.trim().length === 0) {
      throw new ValidationError('Location is required', [
        { field: 'location', message: 'Location must not be empty' },
      ]);
    }

    if (!data.description || data.description.trim().length === 0) {
      throw new ValidationError('Description is required', [
        { field: 'description', message: 'Description must not be empty' },
      ]);
    }

    // Check holidays via Config Service
    try {
      const holidayCheck = await configClient.checkHoliday(data.date, requestId);
      if (holidayCheck.is_holiday) {
        throw new ValidationError('Cannot submit external duty on a holiday', [
          { field: 'date', message: `${data.date} is a holiday: ${holidayCheck.holiday_name || 'Weekend'}` },
        ]);
      }
    } catch (error) {
      // Re-throw validation errors
      if (error instanceof ValidationError) {
        throw error;
      }
      // If config service is unavailable, proceed without holiday check
    }

    const duty = await prisma.externalDuty.create({
      data: {
        userId,
        date,
        location: data.location,
        description: data.description,
        document: data.document || null,
        status: 'pending',
      },
    });

    const formatted = this.formatExternalDuty(duty) as any;
    formatted.user = await authClient.getUser(userId);

    // Notify admins about the new external duty request
    try {
      const userName = formatted.user?.name || 'Karyawan';
      const dateStr = date.toISOString().split('T')[0];

      await notificationClient.sendNotification(
        'external_duty.created',
        'admin' as any,
        {
          duty_id: duty.id,
          date: dateStr,
          location: duty.location,
          message: `Pengajuan dinas luar baru dari ${userName} ke ${duty.location} pada tanggal ${dateStr}`,
        },
        requestId
      );
    } catch {
      // Don't fail creation if notification fails
    }

    return formatted;
  }

  /**
   * Approve an external duty request (admin only).
   * Creates an attendance record for the duty date with status 'dinas_luar'.
   * Notifies the user.
   */
  async approve(id: number, adminId: number, adminNotes: string | undefined, requestId?: string) {
    const duty = await prisma.externalDuty.findUnique({ where: { id } });

    if (!duty) {
      throw new NotFoundError('External duty not found');
    }

    if (duty.status !== 'pending') {
      throw new ValidationError('External duty has already been processed', [
        { field: 'status', message: `Current status: ${duty.status}` },
      ]);
    }

    // Update the duty status
    const updated = await prisma.externalDuty.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: adminId,
        adminNotes: adminNotes || null,
      },
    });

    // Create attendance record with status 'dinas_luar' for the duty date
    const dateStr = duty.date instanceof Date
      ? duty.date.toISOString().split('T')[0]
      : duty.date;

    try {
      await attendanceClient.createAttendanceRecord(
        {
          user_id: duty.userId,
          date: dateStr as string,
          status: 'dinas_luar',
          notes: `External duty at ${duty.location}`,
        },
        requestId
      );
    } catch {
      // Don't fail approval if attendance record creation fails
    }

    // Notify user about approval
    try {
      await notificationClient.sendNotification(
        'external_duty_approved',
        duty.userId,
        {
          duty_id: duty.id,
          date: dateStr,
          location: duty.location,
          message: `Pengajuan dinas luar Anda pada ${dateStr} telah disetujui`,
        },
        requestId
      );
    } catch {
      // Don't fail the approval if notification fails
    }

    const formatted = this.formatExternalDuty(updated) as any;
    formatted.user = await authClient.getUser(updated.userId);
    formatted.approver = await authClient.getUser(adminId);
    return formatted;
  }

  /**
   * Reject an external duty request (admin only).
   * Notifies the user.
   */
  async reject(id: number, adminId: number, adminNotes: string | undefined, requestId?: string) {
    const duty = await prisma.externalDuty.findUnique({ where: { id } });

    if (!duty) {
      throw new NotFoundError('External duty not found');
    }

    if (duty.status !== 'pending') {
      throw new ValidationError('External duty has already been processed', [
        { field: 'status', message: `Current status: ${duty.status}` },
      ]);
    }

    const updated = await prisma.externalDuty.update({
      where: { id },
      data: {
        status: 'rejected',
        approvedBy: adminId,
        adminNotes: adminNotes || null,
      },
    });

    // Notify user about rejection
    const dateStr = duty.date instanceof Date
      ? duty.date.toISOString().split('T')[0]
      : duty.date;

    try {
      await notificationClient.sendNotification(
        'external_duty_rejected',
        duty.userId,
        {
          duty_id: duty.id,
          date: dateStr,
          location: duty.location,
          note: adminNotes || '',
          message: `Pengajuan dinas luar Anda pada ${dateStr} ditolak`,
        },
        requestId
      );
    } catch {
      // Don't fail the rejection if notification fails
    }

    const formatted = this.formatExternalDuty(updated) as any;
    formatted.user = await authClient.getUser(updated.userId);
    formatted.approver = await authClient.getUser(adminId);
    return formatted;
  }

  /**
   * Get approved external duty for a specific user on a specific date.
   * Used by Attendance Service to check if user has external duty.
   */
  async getByUserAndDate(userId: number, date: string) {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new ValidationError('Invalid date format', [
        { field: 'date', message: 'Date must be in YYYY-MM-DD format' },
      ]);
    }

    const duty = await prisma.externalDuty.findFirst({
      where: {
        userId,
        date: dateObj,
        status: 'approved',
      },
    });

    return duty ? this.formatExternalDuty(duty) : null;
  }

  /**
   * Format a Prisma ExternalDuty model to the ExternalDutyDTO response format.
   */
  private formatExternalDuty(duty: any) {
    return {
      id: duty.id,
      userId: duty.userId,
      date: duty.date instanceof Date
        ? duty.date.toISOString().split('T')[0]
        : duty.date,
      location: duty.location,
      description: duty.description,
      document: duty.document,
      status: duty.status,
      approvedBy: duty.approvedBy,
      adminNotes: duty.adminNotes,
      createdAt: duty.createdAt instanceof Date
        ? duty.createdAt.toISOString()
        : duty.createdAt,
      updatedAt: duty.updatedAt instanceof Date
        ? duty.updatedAt.toISOString()
        : duty.updatedAt,
    };
  }
}

export const externalDutyService = new ExternalDutyService();
