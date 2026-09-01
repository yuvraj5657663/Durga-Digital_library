/**
 * Response Utility Tests
 * 
 * Tests for response helper functions in response.js
 * These tests verify response formatting utilities without requiring database or external services.
 */

import {
  successResponse,
  errorResponse,
  paginatedResponse
} from '../src/utils/response.js';

describe('Response Utilities', () => {
  describe('successResponse', () => {
    let mockRes;

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    it('should return success response with default values', () => {
      const result = successResponse(mockRes, { id: 1 });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: { id: 1 }
      });
    });

    it('should return success response with custom message', () => {
      const result = successResponse(mockRes, { id: 1 }, 'Created successfully');

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Created successfully',
        data: { id: 1 }
      });
    });

    it('should return success response with custom status code', () => {
      const result = successResponse(mockRes, { id: 1 }, 'Created', 201);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Created',
        data: { id: 1 }
      });
    });

    it('should handle null data', () => {
      const result = successResponse(mockRes, null);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: null
      });
    });

    it('should handle undefined data', () => {
      const result = successResponse(mockRes, undefined);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: undefined
      });
    });

    it('should handle empty object data', () => {
      const result = successResponse(mockRes, {});

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: {}
      });
    });

    it('should handle array data', () => {
      const result = successResponse(mockRes, [1, 2, 3]);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: [1, 2, 3]
      });
    });

    it('should return the response object', () => {
      const result = successResponse(mockRes, { id: 1 });

      expect(result).toBe(mockRes);
    });
  });

  describe('errorResponse', () => {
    let mockRes;

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    it('should return error response with default values', () => {
      const error = new Error('Test error');
      const result = errorResponse(mockRes, error);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Test error',
        code: 'INTERNAL_ERROR'
      });
    });

    it('should return error response with custom status code', () => {
      const error = new Error('Not found');
      const result = errorResponse(mockRes, error, 404);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not found',
        code: 'INTERNAL_ERROR'
      });
    });

    it('should return error response with error code', () => {
      const error = new Error('Validation failed');
      error.code = 'VALIDATION_ERROR';
      const result = errorResponse(mockRes, error);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR'
      });
    });

    it('should return error response with error details', () => {
      const error = new Error('Validation failed');
      error.code = 'VALIDATION_ERROR';
      error.details = { field: 'email', message: 'Invalid email' };
      const result = errorResponse(mockRes, error);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: { field: 'email', message: 'Invalid email' }
      });
    });

    it('should handle error without message', () => {
      const error = {};
      const result = errorResponse(mockRes, error);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    });

    it('should not include details if not present', () => {
      const error = new Error('Test error');
      error.code = 'TEST_ERROR';
      const result = errorResponse(mockRes, error);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Test error',
        code: 'TEST_ERROR'
      });
      expect(mockRes.json).not.toHaveProperty('details');
    });

    it('should return the response object', () => {
      const error = new Error('Test error');
      const result = errorResponse(mockRes, error);

      expect(result).toBe(mockRes);
    });
  });

  describe('paginatedResponse', () => {
    let mockRes;

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    it('should return paginated response with default values', () => {
      const result = paginatedResponse(mockRes, [1, 2, 3], { page: 1, limit: 10, total: 3 });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: [1, 2, 3],
        pagination: {
          page: 1,
          limit: 10,
          total: 3,
          totalPages: 1
        }
      });
    });

    it('should return paginated response with custom message', () => {
      const result = paginatedResponse(mockRes, [1, 2, 3], { page: 1, limit: 10, total: 3 }, 'Students retrieved');

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Students retrieved',
        data: [1, 2, 3],
        pagination: {
          page: 1,
          limit: 10,
          total: 3,
          totalPages: 1
        }
      });
    });

    it('should calculate totalPages correctly', () => {
      const result = paginatedResponse(mockRes, [1, 2, 3], { page: 1, limit: 10, total: 25 });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: [1, 2, 3],
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3
        }
      });
    });

    it('should handle exact division for totalPages', () => {
      const result = paginatedResponse(mockRes, [], { page: 1, limit: 10, total: 20 });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 20,
          totalPages: 2
        }
      });
    });

    it('should handle page 2', () => {
      const result = paginatedResponse(mockRes, [11, 12, 13], { page: 2, limit: 10, total: 25 });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: [11, 12, 13],
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
          totalPages: 3
        }
      });
    });

    it('should handle zero total', () => {
      const result = paginatedResponse(mockRes, [], { page: 1, limit: 10, total: 0 });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      });
    });

    it('should handle empty data array', () => {
      const result = paginatedResponse(mockRes, [], { page: 1, limit: 10, total: 0 });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      });
    });

    it('should handle different page numbers', () => {
      const result = paginatedResponse(mockRes, [1], { page: 5, limit: 10, total: 45 });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: [1],
        pagination: {
          page: 5,
          limit: 10,
          total: 45,
          totalPages: 5
        }
      });
    });

    it('should handle different limit values', () => {
      const result = paginatedResponse(mockRes, [1, 2], { page: 1, limit: 2, total: 5 });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        data: [1, 2],
        pagination: {
          page: 1,
          limit: 2,
          total: 5,
          totalPages: 3
        }
      });
    });

    it('should return the response object', () => {
      const result = paginatedResponse(mockRes, [1, 2, 3], { page: 1, limit: 10, total: 3 });

      expect(result).toBe(mockRes);
    });
  });

  describe('Response Structure Validation', () => {
    let mockRes;

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    it('should always include success field in successResponse', () => {
      successResponse(mockRes, {});
      const callArgs = mockRes.json.mock.calls[0][0];

      expect(callArgs).toHaveProperty('success');
      expect(callArgs.success).toBe(true);
    });

    it('should always include success field in errorResponse', () => {
      errorResponse(mockRes, new Error('Test'));
      const callArgs = mockRes.json.mock.calls[0][0];

      expect(callArgs).toHaveProperty('success');
      expect(callArgs.success).toBe(false);
    });

    it('should always include success field in paginatedResponse', () => {
      paginatedResponse(mockRes, [], { page: 1, limit: 10, total: 0 });
      const callArgs = mockRes.json.mock.calls[0][0];

      expect(callArgs).toHaveProperty('success');
      expect(callArgs.success).toBe(true);
    });

    it('should always include message field', () => {
      successResponse(mockRes, {});
      const callArgs = mockRes.json.mock.calls[0][0];

      expect(callArgs).toHaveProperty('message');
    });

    it('should always include data field in successResponse', () => {
      successResponse(mockRes, {});
      const callArgs = mockRes.json.mock.calls[0][0];

      expect(callArgs).toHaveProperty('data');
    });

    it('should always include pagination field in paginatedResponse', () => {
      paginatedResponse(mockRes, [], { page: 1, limit: 10, total: 0 });
      const callArgs = mockRes.json.mock.calls[0][0];

      expect(callArgs).toHaveProperty('pagination');
    });

    it('should include all pagination fields', () => {
      paginatedResponse(mockRes, [], { page: 1, limit: 10, total: 0 });
      const callArgs = mockRes.json.mock.calls[0][0];

      expect(callArgs.pagination).toHaveProperty('page');
      expect(callArgs.pagination).toHaveProperty('limit');
      expect(callArgs.pagination).toHaveProperty('total');
      expect(callArgs.pagination).toHaveProperty('totalPages');
    });
  });
});
