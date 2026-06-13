export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly errors?: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    errors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
