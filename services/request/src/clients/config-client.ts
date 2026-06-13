import axios, { AxiosInstance } from 'axios';
import { ServiceUnavailableError, type HolidayCheckResponse } from '@fintap/shared';

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
   * Check if a date is a holiday via Config Service.
   * Returns { is_holiday: boolean, holiday_name: string | null }
   */
  async checkHoliday(date: string, requestId?: string): Promise<HolidayCheckResponse> {
    const res = await this.withRetry(() =>
      this.http.get(`/internal/calendars/is-holiday/${date}`, {
        headers: { 'x-request-id': requestId || '' },
      })
    );
    return res.data.data;
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
      `Config service unavailable: ${lastError?.message}`,
      'SERVICE_UNAVAILABLE'
    );
  }
}

export const configClient = new ConfigClient();
