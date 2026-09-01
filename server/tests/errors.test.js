/**
 * Error Utility Tests
 * 
 * Tests for error classes and asyncHandler in errors.js
 * These tests verify error handling utilities without requiring database or external services.
 */

import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  asyncHandler
} from '../src/utils/errors.js';

describe('Error Utilities', () => {
  describe('AppError', () => {
    it('should create error with message and default status code', () => {
      const error = new AppError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBeNull();
      expect(error.isOperational).toBe(true);
    });

    it('should create error with custom status code', () => {
      const error = new AppError('Test error', 400);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBeNull();
    });

    it('should create error with custom code', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
    });

    it('should preserve stack trace', () => {
      const error = new AppError('Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('Error');
    });

    it('should be instance of Error', () => {
      const error = new AppError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with default status code', () => {
      const error = new ValidationError('Validation failed');

      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should create validation error with details', () => {
      const details = { field: 'email', message: 'Invalid email format' };
      const error = new ValidationError('Validation failed', details);

      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual(details);
    });

    it('should be instance of AppError', () => {
      const error = new ValidationError('Validation failed');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error with default message', () => {
      const error = new AuthenticationError();

      expect(error.message).toBe('Authentication failed');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should create authentication error with custom message', () => {
      const error = new AuthenticationError('Invalid credentials');

      expect(error.message).toBe('Invalid credentials');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should be instance of AppError', () => {
      const error = new AuthenticationError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(AuthenticationError);
    });
  });

  describe('AuthorizationError', () => {
    it('should create authorization error with default message', () => {
      const error = new AuthorizationError();

      expect(error.message).toBe('Access forbidden');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should create authorization error with custom message', () => {
      const error = new AuthorizationError('Admin access required');

      expect(error.message).toBe('Admin access required');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should be instance of AppError', () => {
      const error = new AuthorizationError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(AuthorizationError);
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with default message', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.isOperational).toBe(true);
    });

    it('should create not found error with custom message', () => {
      const error = new NotFoundError('Student not found');

      expect(error.message).toBe('Student not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should be instance of AppError', () => {
      const error = new NotFoundError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NotFoundError);
    });
  });

  describe('ConflictError', () => {
    it('should create conflict error with default message', () => {
      const error = new ConflictError();

      expect(error.message).toBe('Resource conflict');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
      expect(error.isOperational).toBe(true);
    });

    it('should create conflict error with custom message', () => {
      const error = new ConflictError('Email already exists');

      expect(error.message).toBe('Email already exists');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });

    it('should be instance of AppError', () => {
      const error = new ConflictError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ConflictError);
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with default message', () => {
      const error = new RateLimitError();

      expect(error.message).toBe('Too many requests');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.isOperational).toBe(true);
    });

    it('should create rate limit error with custom message', () => {
      const error = new RateLimitError('Rate limit exceeded for IP');

      expect(error.message).toBe('Rate limit exceeded for IP');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should be instance of AppError', () => {
      const error = new RateLimitError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(RateLimitError);
    });
  });

  describe('asyncHandler', () => {
    it('should catch errors from async functions', async () => {
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();

      const asyncFn = async (req, res, next) => {
        throw new Error('Test error');
      };

      const handler = asyncHandler(asyncFn);
      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Test error'
      }));
    });

    it('should pass through successful async functions', async () => {
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();

      const asyncFn = async (req, res, next) => {
        return 'success';
      };

      const handler = asyncHandler(asyncFn);
      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch AppError instances', async () => {
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();

      const asyncFn = async (req, res, next) => {
        throw new ValidationError('Test validation error');
      };

      const handler = asyncHandler(asyncFn);
      await handler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should pass req, res, next to wrapped function', async () => {
      const mockReq = { test: 'req' };
      const mockRes = { test: 'res' };
      const mockNext = jest.fn();

      const asyncFn = jest.fn(async (req, res, next) => {
        expect(req).toBe(mockReq);
        expect(res).toBe(mockRes);
        expect(next).toBe(mockNext);
      });

      const handler = asyncHandler(asyncFn);
      await handler(mockReq, mockRes, mockNext);

      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });
  });

  describe('Error Hierarchy', () => {
    it('should maintain correct inheritance chain', () => {
      const validationError = new ValidationError('Test');
      const authError = new AuthenticationError('Test');
      const authzError = new AuthorizationError('Test');
      const notFoundError = new NotFoundError('Test');
      const conflictError = new ConflictError('Test');
      const rateLimitError = new RateLimitError('Test');

      expect(validationError).toBeInstanceOf(AppError);
      expect(validationError).toBeInstanceOf(Error);

      expect(authError).toBeInstanceOf(AppError);
      expect(authError).toBeInstanceOf(Error);

      expect(authzError).toBeInstanceOf(AppError);
      expect(authzError).toBeInstanceOf(Error);

      expect(notFoundError).toBeInstanceOf(AppError);
      expect(notFoundError).toBeInstanceOf(Error);

      expect(conflictError).toBeInstanceOf(AppError);
      expect(conflictError).toBeInstanceOf(Error);

      expect(rateLimitError).toBeInstanceOf(AppError);
      expect(rateLimitError).toBeInstanceOf(Error);
    });

    it('should have correct status codes for each error type', () => {
      expect(new ValidationError().statusCode).toBe(400);
      expect(new AuthenticationError().statusCode).toBe(401);
      expect(new AuthorizationError().statusCode).toBe(403);
      expect(new NotFoundError().statusCode).toBe(404);
      expect(new ConflictError().statusCode).toBe(409);
      expect(new RateLimitError().statusCode).toBe(429);
    });

    it('should have correct error codes for each error type', () => {
      expect(new ValidationError().code).toBe('VALIDATION_ERROR');
      expect(new AuthenticationError().code).toBe('AUTHENTICATION_ERROR');
      expect(new AuthorizationError().code).toBe('AUTHORIZATION_ERROR');
      expect(new NotFoundError().code).toBe('NOT_FOUND');
      expect(new ConflictError().code).toBe('CONFLICT');
      expect(new RateLimitError().code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});
