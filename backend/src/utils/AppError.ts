/**
 * Custom application error class
 * Extends Error with HTTP status code and operational flag
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly status: string;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common HTTP error factory methods
 */
export const Errors = {
  badRequest: (message: string) => new AppError(message, 400),
  unauthorized: (message: string = 'Unauthorized') => new AppError(message, 401),
  forbidden: (message: string = 'Forbidden') => new AppError(message, 403),
  notFound: (resource: string) => new AppError(`${resource} not found`, 404),
  conflict: (message: string) => new AppError(message, 409),
  validation: (message: string) => new AppError(message, 422),
  internal: (message: string = 'Internal server error') => new AppError(message, 500, false),
};
