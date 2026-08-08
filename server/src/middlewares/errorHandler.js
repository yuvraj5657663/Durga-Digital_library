import logger from '../config/logger.js';
import { AppError } from '../utils/errors.js';
import errorMonitor from '../utils/errorMonitor.js';

export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error with centralized monitoring
  errorMonitor.logError(error, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    userAgent: req.headers['user-agent'],
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404, code: 'NOT_FOUND' };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = { message, statusCode: 409, code: 'DUPLICATE_FIELD' };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400, code: 'VALIDATION_ERROR', details: err.errors };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401, code: 'INVALID_TOKEN' };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401, code: 'TOKEN_EXPIRED' };
  }

  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_ERROR';

  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal server error',
    code,
    ...(error.details && { details: error.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'NOT_FOUND');
  next(error);
};
