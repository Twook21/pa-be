import axios, { AxiosInstance } from 'axios';
import { ServiceUnavailableError, type ActivityDTO } from '@fintap/shared';

export class ActivityClient {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: process.env.SERVICE_ACTIVITY_URL,
      timeout: 5_000,
      headers: { 'x-internal-service': 'true' },
    });
  }

  /**
   * Get the activity for a specific date from Activity Service.
   * GET /internal/activities/by-date/:date
   * Returns the activity or null if none exists for that date.
   */
  async getActivityByDate(date: string, requestId?: string): Promise<ActivityDTO | null> {
    try {
      const res = await this.withRetry(() =>
        this.http.get(`/internal/activities/by-date/${date}`, {
          headers: { 'x-request-id': requestId || '' },
        })
      );
      return res.data.data || null;
    } catch (error: any) {
      // 404 means no activity for that date — not an error
      if (error?.response?.status === 404 || error?.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  private async withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        // Don't retry 404s
        if (error?.response?.status === 404) {
          throw error;
        }
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
