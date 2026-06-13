import axios, { AxiosInstance } from 'axios';
import { ServiceUnavailableError } from '@fintap/shared';

export class AttendanceClient {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: process.env.SERVICE_ATTENDANCE_URL,
      timeout: 5_000,
      headers: { 'x-internal-service': 'true' },
    });
  }

  /**
   * Check if there are attendance records associated with a given activity_id.
   * Returns true if records exist, false otherwise.
   */
  async hasAttendanceRecords(activityId: number, requestId?: string): Promise<boolean> {
    const res = await this.withRetry(() =>
      this.http.get('/internal/attendances', {
        params: { activity_id: activityId },
        headers: { 'x-request-id': requestId || '' },
      })
    );

    const data = res.data?.data;
    if (Array.isArray(data)) {
      return data.length > 0;
    }
    return false;
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
