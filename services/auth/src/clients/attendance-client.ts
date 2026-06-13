import axios, { AxiosInstance } from 'axios';
import { ServiceUnavailableError } from '@fintap/shared';

export class AttendanceClient {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: process.env.SERVICE_ATTENDANCE_URL,
      timeout: 10_000,
      headers: { 'x-internal-service': 'true' },
    });
  }

  /**
   * Get attendance records for a given date.
   * GET /internal/attendances?date_start=YYYY-MM-DD&date_end=YYYY-MM-DD
   */
  async getByDate(date: string, requestId?: string): Promise<any[]> {
    try {
      const response = await this.http.get('/internal/attendances', {
        params: { date_start: date, date_end: date },
        headers: { 'x-request-id': requestId || '' },
      });
      return response.data?.data || [];
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new ServiceUnavailableError('Attendance service unavailable', 'SERVICE_UNAVAILABLE');
      }
      throw error;
    }
  }

  /**
   * Get a single attendance by ID.
   * GET /internal/attendances?id=:id (or we can query by ID)
   */
  async getById(id: number, requestId?: string): Promise<any | null> {
    try {
      const response = await this.http.get('/internal/attendances', {
        params: { id },
        headers: { 'x-request-id': requestId || '' },
      });
      const data = response.data?.data || [];
      return data.length > 0 ? data[0] : null;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new ServiceUnavailableError('Attendance service unavailable', 'SERVICE_UNAVAILABLE');
      }
      throw error;
    }
  }

  /**
   * Update attendance status.
   * PUT /internal/attendances/:id/status
   */
  async updateStatus(id: number, status: string, requestId?: string): Promise<any> {
    try {
      const response = await this.http.put(
        `/internal/attendances/${id}/status`,
        { status },
        { headers: { 'x-request-id': requestId || '' } }
      );
      return response.data?.data;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new ServiceUnavailableError('Attendance service unavailable', 'SERVICE_UNAVAILABLE');
      }
      throw error;
    }
  }

  /**
   * Get attendance records for a month (for report).
   * GET /internal/attendances?date_start=YYYY-MM-01&date_end=YYYY-MM-DD
   */
  async getByMonth(year: number, month: number, requestId?: string): Promise<any[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    try {
      const response = await this.http.get('/internal/attendances', {
        params: { date_start: startDate, date_end: endDate },
        headers: { 'x-request-id': requestId || '' },
      });
      return response.data?.data || [];
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new ServiceUnavailableError('Attendance service unavailable', 'SERVICE_UNAVAILABLE');
      }
      throw error;
    }
  }
}

export const attendanceClient = new AttendanceClient();
