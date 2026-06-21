import axios from 'axios';
import { createLogger } from '@fintap/shared';

const logger = createLogger('onesignal-service');

/**
 * OneSignal Web Push service.
 * Integrates with OneSignal REST API to send push notifications.
 */
export class OneSignalService {
  private isConfigured = false;
  private appId: string | undefined;
  private apiKey: string | undefined;

  constructor() {
    this.appId = process.env.ONESIGNAL_APP_ID || '18e2ee16-50b5-4764-b93c-a2bc9c1bbb1b';
    this.apiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!this.appId || !this.apiKey) {
      logger.warn('ONESIGNAL_REST_API_KEY not configured, push notifications will fail or be disabled');
    } else {
      this.isConfigured = true;
      logger.info('OneSignal Service configured');
    }
  }

  /**
   * Send a push notification via OneSignal.
   *
   * @param subscriptionId The OneSignal Subscription ID (stored in DB as fcmToken)
   * @param type Notification type/title
   * @param data Payload data
   */
  async sendPushNotification(
    subscriptionId: string,
    type: string,
    data: Record<string, unknown>
  ): Promise<void> {
    if (!this.isConfigured) {
      logger.warn('OneSignal not fully configured, skipping push notification');
      return;
    }

    try {
      const payload = {
        app_id: this.appId,
        include_player_ids: [subscriptionId],
        headings: { en: type },
        contents: { en: data.message ? String(data.message) : 'You have a new notification' },
        data: data
      };

      await axios.post('https://onesignal.com/api/v1/notifications', payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.apiKey}`
        }
      });

      logger.info('OneSignal push notification sent', { type, subscriptionId: subscriptionId.substring(0, 10) + '...' });
    } catch (error: any) {
      logger.error('Error sending OneSignal push notification', {
        error: error.response?.data || error.message
      });
    }
  }
}

export const onesignalService = new OneSignalService();
