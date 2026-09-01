import userRepository from '../src/repositories/UserRepository.js';

// Mock dependencies
jest.mock('../src/repositories/UserRepository.js');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../src/config/logger.js');
jest.mock('../src/models/AuditLog.js', () => ({
  create: jest.fn().mockResolvedValue({})
}));

// Setup bcrypt and jwt mocks before importing authService
const bcrypt = require('bcrypt');
bcrypt.compare.mockResolvedValue(true);
bcrypt.hash.mockResolvedValue('hashedpassword');

const jwt = require('jsonwebtoken');
jwt.sign.mockReturnValue('mock-token');
jwt.verify.mockReturnValue({ userId: '123', role: 'admin' });

import { login, refreshToken } from '../src/services/authService.js';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mocks
    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue('hashedpassword');
    jwt.sign.mockReturnValue('mock-token');
    jwt.verify.mockReturnValue({ userId: '123', role: 'admin' });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011', // Valid ObjectId string
        username: 'admin',
        email: 'admin@test.com',
        role: 'admin',
        passwordHash: 'hashedpassword'
      };

      userRepository.findByLoginId.mockResolvedValue(mockUser);
      
      const result = await login('admin', 'password123', '127.0.0.1', 'test-agent');
      
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toHaveProperty('role', 'admin');
    });

    it('should throw error for invalid credentials', async () => {
      userRepository.findByLoginId.mockResolvedValue(null);
      
      await expect(login('invalid', 'wrong', '127.0.0.1', 'test-agent'))
        .rejects.toThrow('Invalid credentials');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        username: 'admin',
        email: 'admin@test.com',
        role: 'admin'
      };

      userRepository.findById.mockResolvedValue(mockUser);
      
      const result = await refreshToken('valid-refresh-token');
      
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw error for invalid refresh token', async () => {
      userRepository.findById.mockResolvedValue(null);
      
      await expect(refreshToken('invalid-token'))
        .rejects.toThrow('Invalid refresh token');
    });
  });
});
