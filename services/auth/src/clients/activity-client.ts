import axios, { AxiosInstance } from 'axios';
import { ServiceUnavailableError } from '@fintap/shared';

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
   * Get activities for a given date.
   * GET /internal/activities/by-date/:date
   */
  async getByDate(date: string, requestId?: string): Promise<any[]> {
    try {
      const response = await this.http.get(`/internal/activities/by-date/${date}`, {
        headers: { 'x-request-id': requestId || '' },
      });
      // API might return single activity or array
      const data = response.data?.data;
      if (!data) return [];
      return Array.isArray(data) ? data : [data];
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new ServiceUnavailableError('Activity service unavailable', 'SERVICE_UNAVAILABLE');
      }
      // Fallback — return empty if activity service returns 404 (no activity for that date)
      if (error.response?.status === 404) return [];
      return [];
    }
  }
}

export const activityClient = new ActivityClient();
