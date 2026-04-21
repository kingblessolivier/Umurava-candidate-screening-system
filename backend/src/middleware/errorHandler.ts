import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

interface ErrorResponse {
  success: false;
  error: string;
  stack?: string;
}

/**
 * Global error handling middleware
 * Catches all errors and returns consistent JSON response
 */
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Default error values
  let statusCode = 500;
  let message = 'Internal server error';
  let isOperational = false;

  // Handle AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }

  // Handle MongoDB duplicate key error
  if ((err as { code?: number }).code === 11000) {
    statusCode = 409;
    message = 'Duplicate field value';
    isOperational = true;
  }

  // Handle MongoDB validation error
  if (err.name === 'ValidationError') {
    statusCode = 422;
    const ve = err as unknown as { errors: Record<string, { message: string }> };
    message = Object.values(ve.errors).map((e) => e.message).join(', ');
    isOperational = true;
  }

  // Handle MongoDB cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    const ce = err as unknown as { path: string; value: string };
    statusCode = 400;
    message = `Invalid ${ce.path}: ${ce.value}`;
    isOperational = true;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    isOperational = true;
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    isOperational = true;
  }

  const response: ErrorResponse = {
    success: false,
    error: message,
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    console.error('Error:', {
      statusCode,
      message,
      stack: err.stack,
      isOperational,
    });
  } else if (!isOperational) {
    // Log unexpected errors in production
    console.error('Unexpected error:', err);
  }

  res.status(statusCode).json(response);
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (
  _req: Request,
  _res: Response,
  next: NextFunction
) => {
  next(new AppError(`Route not found`, 404));
};
