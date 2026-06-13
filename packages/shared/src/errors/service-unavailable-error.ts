import { AppError } from './app-error.js';

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable', code = 'SERVICE_UNAVAILABLE') {
    super(message, 503, code);
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}
