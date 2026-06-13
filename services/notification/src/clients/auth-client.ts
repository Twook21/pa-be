import axios, { AxiosInstance } from 'axios';
import { ServiceUnavailableError, createLogger } from '@fintap/shared';

const logger = createLogger('notification-service');

/**
 * HTTP client for communicating with the Auth Service.
 * Used to retrieve user email and fcmToken for notification delivery.
 */
export class AuthClient {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: process.env.SERVICE_AUTH_URL,
      timeout: 5_000,
      headers: { 'x-internal-service': 'true' },
    });
  }

  /**
   * GET /internal/users/:id - Get user data (email, fcmToken) for notification delivery.
   */
  async getUserById(userId: number, requestId?: string): Promise<{
    id: number;
    name: string;
    email: string;
    fcmToken: string | null;
    status: string;
  }> {
    const res = await this.withRetry(() =>
      this.http.get(`/internal/users/${userId}`, {
        headers: { 'x-request-id': requestId || '' },
      })
    );
    return res.data.data;
  }

  /**
   * Get all active users for broadcast notifications.
   * Uses the internal users endpoint with status filter.
   */
  async getAllActiveUsers(requestId?: string): Promise<Array<{
    id: number;
    name: string;
    email: string;
    fcmToken: string | null;
  }>> {
    try {
      const res = await this.withRetry(() =>
        this.http.get('/internal/users', {
          params: { status: 'active' },
          headers: { 'x-request-id': requestId || '' },
        })
      );
      return res.data.data || [];
    } catch (error) {
      logger.error('Failed to get active users', { error: (error as Error).message });
      return [];
    }
  }

  /**
   * Get all admin users from Auth Service.
   */
  async getAllAdmins(requestId?: string): Promise<Array<{
    id: number;
    name: string;
    email: string;
    fcmToken: string | null;
  }>> {
    try {
      const res = await this.withRetry(() =>
        this.http.get('/internal/users', {
          params: { role: 'admin' },
          headers: { 'x-request-id': requestId || '' },
        })
      );
      return res.data.data || [];
    } catch (error) {
      logger.error('Failed to get admin users', { error: (error as Error).message });
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
      `Auth service unavailable: ${lastError?.message}`,
      'SERVICE_UNAVAILABLE'
    );
  }
}

export const authClient = new AuthClient();
