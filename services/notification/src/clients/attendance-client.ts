import axios, { AxiosInstance } from 'axios';
import { ServiceUnavailableError, createLogger } from '@fintap/shared';

const logger = createLogger('notification-service');

export class AttendanceClient {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: process.env.SERVICE_ATTENDANCE_URL || 'http://localhost:3002',
      timeout: 5_000,
      headers: { 'x-internal-service': 'true' },
    });
  }

  /**
   * GET /internal/attendances - Get attendances for a date range.
   */
  async getAttendances(params: { date_start: string; date_end: string }, requestId?: string): Promise<any[]> {
    try {
      const res = await this.withRetry(() =>
        this.http.get('/internal/attendances', {
          params,
          headers: { 'x-request-id': requestId || '' },
        })
      );
      return res.data.data || [];
    } catch (error) {
      logger.error('Failed to get attendance records', { params, error: (error as Error).message });
      return [];
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
      `Attendance service unavailable: ${lastError?.message}`,
      'SERVICE_UNAVAILABLE'
    );
  }
}

export const attendanceClient = new AttendanceClient();
