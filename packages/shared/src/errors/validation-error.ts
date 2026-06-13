import { AppError } from './app-error.js';

export class ValidationError extends AppError {
  constructor(message: string, errors?: Array<{ field: string; message: string }>) {
    super(message, 422, 'VALIDATION_ERROR', errors);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
