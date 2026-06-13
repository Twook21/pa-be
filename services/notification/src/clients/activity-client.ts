import axios, { AxiosInstance } from 'axios';
import { ServiceUnavailableError, createLogger } from '@fintap/shared';

const logger = createLogger('notification-service');

export class ActivityClient {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: process.env.SERVICE_ACTIVITY_URL || 'http://localhost:3003',
      timeout: 5_000,
      headers: { 'x-internal-service': 'true' },
    });
  }

  /**
   * GET /internal/activities/by-date/:date - Get activity by date.
   */
  async getByDate(date: string, requestId?: string): Promise<any> {
    try {
      const res = await this.withRetry(() =>
        this.http.get(`/internal/activities/by-date/${date}`, {
          headers: { 'x-request-id': requestId || '' },
        })
      );
      return res.data.data;
    } catch (error) {
      logger.error('Failed to get activity by date', { date, error: (error as Error).message });
      return null;
    }
  }

  private async withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    throw new ServiceUnavailableError(
      `Activity service unavailable: ${lastError?.message}`,
      'SERVICE_UNAVAILABLE'
    );
  }
}

export const activityClient = new ActivityClient();
