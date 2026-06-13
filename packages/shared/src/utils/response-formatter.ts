import type { ApiResponse, ApiErrorResponse } from '../types/common.js';

export function formatSuccess<T>(message: string, data?: T): ApiResponse<T> {
  return { status: 'success', message, data };
}

export function formatError(
  message: string,
  code: string,
  errors?: Array<{ field: string; message: string }>
): ApiErrorResponse {
  return { status: 'error', message, code, errors };
}
