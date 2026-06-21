import { PrismaClient } from '../db.js';
import {
  NotFoundError,
  ValidationError,
  type CreateLeaveRequestDTO,
  type PaginationParams,
} from '@fintap/shared';
import { configClient } from '../clients/config-client.js';
import { attendanceClient } from '../clients/attendance-client.js';
import { notificationClient } from '../clients/notification-client.js';
import { authClient } from '../clients/auth-client.js';

const prisma = new PrismaClient();

export class LeaveRequestService {
  /**
   * List leave requests with pagination.
   * Admin sees all, user sees only their own.
   */
  async list(pagination: PaginationParams, userId: number, userRole: string) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where = userRole === 'admin' ? {} : { userId };

    const [requests, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    return {
      data: requests.map(this.formatLeaveRequest),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single leave request by ID.
   */
  async getById(id: number, userId: number, userRole: string) {
    const request = await prisma.leaveRequest.findUnique({ where: { id } });

    if (!request) {
      throw new NotFoundError('Leave request not found');
    }

    // Non-admin users can only view their own requests
    if (userRole !== 'admin' && request.userId !== userId) {
      throw new NotFoundError('Leave request not found');
    }

    return this.formatLeaveRequest(request);
  }

  /**
   * Create a new leave request.
   * Checks holidays on the requested dates via Config Service.
   */
  async create(data: CreateLeaveRequestDTO, userId: number, requestId?: string) {
    // Validate dates
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new ValidationError('Invalid date format', [
        { field: 'startDate', message: 'startDate must be a valid date (YYYY-MM-DD)' },
        { field: 'endDate', message: 'endDate must be a valid date (YYYY-MM-DD)' },
      ]);
    }

    if (endDate < startDate) {
      throw new ValidationError('End date must be after or equal to start date', [
        { field: 'endDate', message: 'endDate must be >= startDate' },
      ]);
    }

    // Validate type
    const validTypes = ['cuti', 'sakit', 'izin'];
    if (!validTypes.includes(data.type)) {
      throw new ValidationError('Invalid leave request type', [
        { field: 'type', message: 'Type must be "cuti", "sakit", or "izin"' },
      ]);
    }

    // Check holidays on start/end dates via Config Service
    try {
      const holidayCheck = await configClient.checkHoliday(data.startDate, requestId);
      if (holidayCheck.is_holiday) {
        throw new ValidationError('Cannot submit leave request on a holiday', [
          { field: 'startDate', message: `${data.startDate} is a holiday: ${holidayCheck.holiday_name || 'Weekend'}` },
        ]);
      }
    } catch (error) {
      // Re-throw validation errors
      if (error instanceof ValidationError) {
        throw error;
      }
      // If config service is unavailable, proceed without holiday check
    }

    const request = await prisma.leaveRequest.create({
      data: {
        userId,
        type: data.type,
        reason: data.reason,
        startDate,
        endDate,
        photo: data.photo || null,
        status: 'pending',
      },
    });

    // Notify admins about the new leave request
    try {
      const user = await authClient.getUser(userId, requestId);
      const userName = user?.name || 'Karyawan';
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      await notificationClient.sendNotification(
        'leave_request.created',
        'admin' as any,
        {
          request_id: request.id,
          type: request.type,
          start_date: startDateStr,
          end_date: endDateStr,
          user_name: userName,
          message: `Pengajuan izin/cuti (${request.type}) baru dari ${userName} untuk tanggal ${startDateStr} s/d ${endDateStr}`,
        },
        requestId
      );
    } catch {
      // Don't fail leave request creation if notification fails
    }

    return this.formatLeaveRequest(request);
  }

  /**
   * Approve a leave request (admin only).
   * Creates attendance records for each working day in the date range.
   * Notifies the user.
   */
  async approve(id: number, adminNote: string | undefined, requestId?: string) {
    const request = await prisma.leaveRequest.findUnique({ where: { id } });

    if (!request) {
      throw new NotFoundError('Leave request not found');
    }

    if (request.status !== 'pending') {
      throw new ValidationError('Leave request has already been processed', [
        { field: 'status', message: `Current status: ${request.status}` },
      ]);
    }

    // Update the request status
    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'approved',
        note: adminNote || null,
        responseDate: new Date(),
      },
    });

    // Create attendance records for each working day in the range
    const attendanceStatus = request.type === 'sakit' ? 'sakit' : 'cuti';
    await this.createAttendanceRecordsForRange(
      request.userId,
      request.startDate,
      request.endDate,
      attendanceStatus,
      requestId
    );

    // Notify user about approval
    try {
      await notificationClient.sendNotification(
        'leave_request_approved',
        request.userId,
        {
          request_id: request.id,
          type: request.type,
          start_date: request.startDate.toISOString().split('T')[0],
          end_date: request.endDate.toISOString().split('T')[0],
          message: `Pengajuan ${request.type} Anda telah disetujui`,
        },
        requestId
      );
    } catch {
      // Don't fail the approval if notification fails
    }

    return this.formatLeaveRequest(updated);
  }

  /**
   * Reject a leave request (admin only).
   * Notifies the user.
   */
  async reject(id: number, adminNote: string | undefined, requestId?: string) {
    const request = await prisma.leaveRequest.findUnique({ where: { id } });

    if (!request) {
      throw new NotFoundError('Leave request not found');
    }

    if (request.status !== 'pending') {
      throw new ValidationError('Leave request has already been processed', [
        { field: 'status', message: `Current status: ${request.status}` },
      ]);
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        note: adminNote || null,
        responseDate: new Date(),
      },
    });

    // Notify user about rejection
    try {
      await notificationClient.sendNotification(
        'leave_request_rejected',
        request.userId,
        {
          request_id: request.id,
          type: request.type,
          start_date: request.startDate.toISOString().split('T')[0],
          end_date: request.endDate.toISOString().split('T')[0],
          note: adminNote || '',
          message: `Pengajuan ${request.type} Anda ditolak`,
        },
        requestId
      );
    } catch {
      // Don't fail the rejection if notification fails
    }

    return this.formatLeaveRequest(updated);
  }

  /**
   * Delete a leave request.
   * Can only be deleted by the user who created it, or an admin.
   */
  async delete(id: number, userId: number, userRole: string) {
    const request = await prisma.leaveRequest.findUnique({ where: { id } });

    if (!request) {
      throw new NotFoundError('Leave request not found');
    }

    if (userRole !== 'admin' && request.userId !== userId) {
      throw new NotFoundError('Leave request not found');
    }

    await prisma.leaveRequest.delete({ where: { id } });
  }

  /**
   * Create attendance records for each working day in a date range.
   * Skips weekends and holidays.
   */
  private async createAttendanceRecordsForRange(
    userId: number,
    startDate: Date,
    endDate: Date,
    status: string,
    requestId?: string
  ) {
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday

      // Skip weekends
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Check if it's a holiday
        let isHoliday = false;
        try {
          const holidayCheck = await configClient.checkHoliday(dateStr, requestId);
          isHoliday = holidayCheck.is_holiday;
        } catch {
          // If config service is unavailable, assume it's not a holiday
        }

        // Only create record for working days
        if (!isHoliday) {
          try {
            await attendanceClient.createAttendanceRecord(
              {
                user_id: userId,
                date: dateStr,
                status,
                notes: `Auto-created from approved leave request (${status})`,
              },
              requestId
            );
          } catch {
            // Log but continue with other dates if one fails
          }
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  /**
   * Format a Prisma LeaveRequest model to the LeaveRequestDTO response format.
   */
  private formatLeaveRequest(request: any) {
    return {
      id: request.id,
      userId: request.userId,
      type: request.type,
      reason: request.reason,
      startDate: request.startDate instanceof Date
        ? request.startDate.toISOString().split('T')[0]
        : request.startDate,
      endDate: request.endDate instanceof Date
        ? request.endDate.toISOString().split('T')[0]
        : request.endDate,
      status: request.status,
      photo: request.photo,
      note: request.note,
      responseDate: request.responseDate instanceof Date
        ? request.responseDate.toISOString()
        : request.responseDate,
      createdAt: request.createdAt instanceof Date
        ? request.createdAt.toISOString()
        : request.createdAt,
      updatedAt: request.updatedAt instanceof Date
        ? request.updatedAt.toISOString()
        : request.updatedAt,
    };
  }
}

export const leaveRequestService = new LeaveRequestService();
