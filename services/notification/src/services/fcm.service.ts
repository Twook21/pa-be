import { createLogger } from '@fintap/shared';

const logger = createLogger('notification-service');

/**
 * Firebase Cloud Messaging service.
 * Integrates with firebase-admin to send push notifications.
 */
export class FcmService {
  private initialized = false;
  private messaging: any = null;

  /**
   * Initialize Firebase Admin SDK.
   * Uses FIREBASE_PROJECT_ID env var and application default credentials.
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
      if (!firebaseProjectId) {
        logger.warn('FIREBASE_PROJECT_ID not configured, FCM notifications disabled');
        this.initialized = true;
        return;
      }

      const admin = await import('firebase-admin');

      // Initialize only if not already initialized
      if (admin.default.apps.length === 0) {
        admin.default.initializeApp({
          projectId: firebaseProjectId,
        });
      }

      this.messaging = admin.default.messaging();
      this.initialized = true;
      logger.info('Firebase Admin SDK initialized');
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin SDK', {
        error: (error as Error).message,
      });
      this.initialized = true; // Mark as initialized to avoid retrying
    }
  }

  /**
   * Send a push notification via FCM.
   */
  async sendPushNotification(
    fcmToken: string,
    type: string,
    data: Record<string, unknown>
  ): Promise<void> {
    await this.initialize();

    if (!this.messaging) {
      logger.warn('FCM messaging not available, skipping push notification');
      return;
    }

    const title = this.getNotificationTitle(type);
    const body = this.getNotificationBody(type, data);

    const message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: {
        type,
        payload: JSON.stringify(data),
      },
    };

    await this.messaging.send(message);
    logger.info('FCM notification sent', { type, token: fcmToken.substring(0, 10) + '...' });
  }

  /**
   * Get notification title based on type.
   */
  private getNotificationTitle(type: string): string {
    const titles: Record<string, string> = {
      'attendance.late': 'Peringatan Keterlambatan',
      'leave_request.approved': 'Pengajuan Disetujui',
      'leave_request.rejected': 'Pengajuan Ditolak',
      'external_duty.approved': 'Dinas Luar Disetujui',
      'external_duty.rejected': 'Dinas Luar Ditolak',
      'activity.created': 'Kegiatan Baru',
      'holiday.tomorrow': 'Pengingat Hari Libur',
      'password.reset': 'Reset Password',
    };
    return titles[type] || 'Notifikasi FinTap';
  }

  /**
   * Get notification body based on type and data.
   */
  private getNotificationBody(type: string, data: Record<string, unknown>): string {
    if (data.message && typeof data.message === 'string') {
      return data.message;
    }

    const bodies: Record<string, string> = {
      'attendance.late': 'Anda tercatat terlambat hari ini.',
      'leave_request.approved': 'Pengajuan izin/cuti Anda telah disetujui.',
      'leave_request.rejected': 'Pengajuan izin/cuti Anda ditolak.',
      'external_duty.approved': 'Pengajuan dinas luar Anda telah disetujui.',
      'external_duty.rejected': 'Pengajuan dinas luar Anda ditolak.',
      'activity.created': 'Ada kegiatan baru yang dijadwalkan.',
      'holiday.tomorrow': `Besok adalah hari libur: ${data.holiday_name || 'Hari Libur'}`,
      'password.reset': 'Link reset password telah dikirim.',
    };
    return bodies[type] || 'Anda memiliki notifikasi baru.';
  }
}

export const fcmService = new FcmService();
