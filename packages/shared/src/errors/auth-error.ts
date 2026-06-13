import { AppError } from './app-error.js';

export class AuthenticationError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'AUTH_INVALID_TOKEN');
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'AUTH_FORBIDDEN');
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}
