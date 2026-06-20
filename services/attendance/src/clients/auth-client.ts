import axios, { AxiosInstance } from 'axios';
import { ServiceUnavailableError } from '@fintap/shared';

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
   * Validate that the given deviceId matches what was registered for this user at login.
   * POST /internal/validate-device
   * Returns { valid: boolean, reason?: string }
   */
  async validateDevice(userId: number, deviceId: string): Promise<{ valid: boolean; reason?: string }> {
    try {
      const res = await this.http.post('/internal/validate-device', { userId, deviceId });
      return res.data.data;
    } catch (error: any) {
      // If auth service is down, fail open with a warning (don't block attendance on infra failure)
      console.error('[auth-client] Device validation failed:', error?.message);
      return { valid: true };
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
