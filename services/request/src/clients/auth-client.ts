import axios, { AxiosInstance } from 'axios';
import { ServiceUnavailableError } from '@fintap/shared';

export class AuthClient {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: process.env.SERVICE_AUTH_URL || 'http://localhost:3001',
      timeout: 5_000,
      headers: { 'x-internal-service': 'true' },
    });
  }

  /**
   * Get user data by ID from Auth Service.
   */
  async getUser(id: number, requestId?: string): Promise<any> {
    try {
      const res = await this.withRetry(() =>
        this.http.get(`/internal/users/${id}`, {
          headers: { 'x-request-id': requestId || '' },
        })
      );
      return res.data.data;
    } catch (error) {
      // Fallback/log and return null if auth service is down or user not found
      return null;
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
      `Auth service unavailable: ${lastError?.message}`,
      'SERVICE_UNAVAILABLE'
    );
  }
}

export const authClient = new AuthClient();
