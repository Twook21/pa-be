export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  message: string;
  data?: T;
}

export interface ApiErrorResponse {
  status: 'error';
  message: string;
  code: string;
  errors?: ValidationErrorDetail[];
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  error?: string;
}
