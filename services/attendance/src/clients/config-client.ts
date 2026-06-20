import axios, { AxiosInstance } from 'axios';
import {
  ServiceUnavailableError,
  type LocationDTO,
  type AttendanceSettingDTO,
  type HolidayCheckResponse,
} from '@fintap/shared';

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
   * Get the current active office locations from Config Service.
   * GET /internal/locations/current
   */
  async getCurrentLocation(requestId?: string): Promise<LocationDTO[]> {
    const res = await this.withRetry(() =>
      this.http.get('/internal/locations/current', {
        headers: { 'x-request-id': requestId || '' },
      })
    );
    return res.data.data;
  }

  /**
   * Get the active attendance settings from Config Service.
   * GET /internal/attendance-settings/active
   */
  async getActiveSettings(requestId?: string): Promise<AttendanceSettingDTO> {
    const res = await this.withRetry(() =>
      this.http.get('/internal/attendance-settings/active', {
        headers: { 'x-request-id': requestId || '' },
      })
    );
    return res.data.data;
  }

  /**
   * Check if a given date is a holiday via Config Service.
   * GET /internal/calendars/is-holiday/:date
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
