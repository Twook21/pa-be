import { PrismaClient } from '../db.js';
import { NotFoundError, createLogger } from '@fintap/shared';
import type { SendNotificationDTO } from '@fintap/shared';
import { authClient } from '../clients/auth-client.js';
import { mailService } from './mail.service.js';
import { fcmService } from './fcm.service.js';

const prisma = new PrismaClient();
const logger = createLogger('notification-service');

export class NotificationService {
  /**
   * List notifications for a user with pagination.
   */
  async list(userId: number, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: {
          notifiableType: 'user',
          notifiableId: userId,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({
        where: {
          notifiableType: 'user',
          notifiableId: userId,
        },
      }),
    ]);

    return {
      notifications: notifications.map(this.formatNotification),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(notificationId: string, userId: number) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        notifiableType: 'user',
        notifiableId: userId,
      },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    return this.formatNotification(updated);
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId: number) {
    const result = await prisma.notification.updateMany({
      where: {
        notifiableType: 'user',
        notifiableId: userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return { count: result.count };
  }

  /**
   * Send notification: save to DB, then attempt email + FCM (partial failure tolerant).
   */
  async send(payload: SendNotificationDTO): Promise<void> {
    const { type, recipient_user_id, data } = payload;

    // 1) Always save to DB first
    await prisma.notification.create({
      data: {
        type,
        notifiableType: 'user',
        notifiableId: recipient_user_id as number,
        data: JSON.stringify(data),
      },
    });

    // 2) Get user info from Auth Service for email/FCM
    let userEmail: string | null = null;
    let fcmToken: string | null = null;

    try {
      const user = await authClient.getUserById(recipient_user_id as number);
      userEmail = user.email || null;
      fcmToken = user.fcmToken || null;
    } catch (error) {
      logger.error('Failed to get user data from Auth Service', {
        userId: recipient_user_id,
        error: (error as Error).message,
      });
      // Don't fail the operation — partial failure tolerance
      return;
    }

    // 3) Send email (fire and forget, log errors)
    if (userEmail) {
      try {
        await mailService.sendNotificationEmail(userEmail, type, data);
      } catch (error) {
        logger.error('Failed to send email notification', {
          userId: recipient_user_id,
          email: userEmail,
          error: (error as Error).message,
        });
      }
    }

    // 4) Send FCM push notification (fire and forget, log errors)
    if (fcmToken) {
      try {
        let title = 'Fintap';
        let body = 'Anda memiliki notifikasi baru.';

        if (type.includes('leave_request')) title = 'Pengajuan Izin/Cuti';
        if (type.includes('external_duty')) title = 'Pengajuan Dinas Luar';
        if (type.includes('activity')) title = 'Info Kegiatan';
        if (type.includes('attendance.late')) {
          title = 'Peringatan Absensi';
          body = 'Anda tercatat terlambat hari ini.';
        }
        
        // Extract title and body from data if available
        if (data && typeof data === 'object') {
          if ('title' in data) title = String(data.title);
          if ('message' in data) body = String(data.message);
          else if ('body' in data) body = String(data.body);
        }

        await fcmService.sendPushNotification([fcmToken], title, body, data as Record<string, string>);
      } catch (err) {
        logger.error('Failed to send FCM notification', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  /**
   * Send notification to all active users (used by holiday alert job).
   */
  async sendToAllActiveUsers(type: string, data: Record<string, unknown>): Promise<void> {
    try {
      const users = await authClient.getAllActiveUsers();

      for (const user of users) {
        try {
          await this.send({
            type,
            recipient_user_id: user.id,
            data,
          });
        } catch (error) {
          logger.error('Failed to send notification to user', {
            userId: user.id,
            error: (error as Error).message,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to get active users for broadcast notification', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Send notification to all admin users.
   */
  async sendToAllAdmins(type: string, data: Record<string, unknown>): Promise<void> {
    try {
      const admins = await authClient.getAllAdmins();

      for (const admin of admins) {
        try {
          await this.send({
            type,
            recipient_user_id: admin.id,
            data,
          });
        } catch (error) {
          logger.error('Failed to send notification to admin', {
            adminId: admin.id,
            error: (error as Error).message,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to get admin users for broadcast', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Format Prisma Notification to response DTO.
   */
  private formatNotification(notification: any) {
    return {
      id: notification.id,
      type: notification.type,
      notifiableType: notification.notifiableType,
      notifiableId: notification.notifiableId,
      data: notification.data,
      readAt: notification.readAt instanceof Date
        ? notification.readAt.toISOString()
        : notification.readAt,
      createdAt: notification.createdAt instanceof Date
        ? notification.createdAt.toISOString()
        : notification.createdAt,
      updatedAt: notification.updatedAt instanceof Date
        ? notification.updatedAt.toISOString()
        : notification.updatedAt,
    };
  }
}

export const notificationService = new NotificationService();
