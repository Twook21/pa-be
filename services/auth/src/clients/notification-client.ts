import axios, { AxiosInstance } from 'axios';
import { ServiceUnavailableError } from '@fintap/shared';

export class NotificationClient {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: process.env.SERVICE_NOTIFICATION_URL,
      timeout: 2_000, // Reduced from 5s to 2s to ensure it fails fast within Vercel's 10s limit
      headers: { 'x-internal-service': 'true' },
    });
  }

  /**
   * Send a notification to a specific user via Notification Service.
   * POST /internal/notifications/send
   */
  async sendNotification(
    type: string,
    recipientUserId: number,
    data: Record<string, unknown>,
    requestId?: string
  ): Promise<void> {
    await this.withRetry(() =>
      this.http.post(
        '/internal/notifications/send',
        { type, recipient_user_id: recipientUserId, data },
        { headers: { 'x-request-id': requestId || '' } }
      )
    );
  }

  private async withRetry<T>(fn: () => Promise<T>, maxRetries = 1): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay instead of 1000ms
        }
      }
    }
    throw new ServiceUnavailableError(
      `Notification service unavailable: ${lastError?.message}`,
      'SERVICE_UNAVAILABLE'
    );
  }
}

export const notificationClient = new NotificationClient();
