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
   * Create an attendance record via Attendance Service internal endpoint.
   * Used when a leave request is approved to create attendance records
   * with appropriate status (cuti/sakit) for each working day.
   */
  async createAttendanceRecord(
    data: {
      user_id: number;
      date: string;
      status: string;
      notes?: string;
    },
    requestId?: string
  ): Promise<void> {
    await this.withRetry(() =>
      this.http.post('/internal/attendances', data, {
        headers: { 'x-request-id': requestId || '' },
      })
    );
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
