import axios, { AxiosInstance } from 'axios';
import { ServiceUnavailableError } from '@fintap/shared';

export class ConfigClient {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: process.env.SERVICE_CONFIG_URL,
      timeout: 5_000,
      headers: { 'x-internal-service': 'true' },
    });
  }

  /**
   * Check if a date is a holiday.
   * GET /internal/calendars/is-holiday/:date
   */
  async checkHoliday(date: string, requestId?: string): Promise<{ is_holiday: boolean; holiday_name: string | null }> {
    try {
      const response = await this.http.get(`/internal/calendars/is-holiday/${date}`, {
        headers: { 'x-request-id': requestId || '' },
      });
      return response.data?.data || { is_holiday: false, holiday_name: null };
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new ServiceUnavailableError('Config service unavailable', 'SERVICE_UNAVAILABLE');
      }
      // Fallback — don't block dashboard if config service is down
      return { is_holiday: false, holiday_name: null };
    }
  }

  /**
   * Get all holidays for a month.
   * GET /internal/calendars/holidays?month=YYYY-MM
   */
  async getHolidays(month: string, requestId?: string): Promise<any[]> {
    try {
      const response = await this.http.get('/internal/calendars/holidays', {
        params: { month },
        headers: { 'x-request-id': requestId || '' },
      });
      return response.data?.data || [];
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new ServiceUnavailableError('Config service unavailable', 'SERVICE_UNAVAILABLE');
      }
      return [];
    }
  }
}

export const configClient = new ConfigClient();
