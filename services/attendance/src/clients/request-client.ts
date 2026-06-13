import axios, { AxiosInstance } from 'axios';
import { ServiceUnavailableError, type ExternalDutyDTO } from '@fintap/shared';

export class RequestClient {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: process.env.SERVICE_REQUEST_URL,
      timeout: 5_000,
      headers: { 'x-internal-service': 'true' },
    });
  }

  /**
   * Check if a user has an approved external duty on a given date.
   * GET /internal/external-duties/by-user-date?user_id=X&date=YYYY-MM-DD
   * Returns the external duty or null if none exists.
   */
  async getExternalDuty(userId: number, date: string, requestId?: string): Promise<ExternalDutyDTO | null> {
    try {
      const res = await this.withRetry(() =>
        this.http.get('/internal/external-duties/by-user-date', {
          params: { user_id: userId, date },
          headers: { 'x-request-id': requestId || '' },
        })
      );
      return res.data.data || null;
    } catch (error: any) {
      // 404 means no external duty found — not an error
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
      `Request service unavailable: ${lastError?.message}`,
      'SERVICE_UNAVAILABLE'
    );
  }
}

export const requestClient = new RequestClient();
