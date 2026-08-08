import { login, refreshToken } from '../src/services/authService.js';
import userRepository from '../src/repositories/UserRepository.js';

// Mock dependencies
jest.mock('../src/repositories/UserRepository.js');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../src/config/logger.js');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        _id: '123',
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
        _id: '123',
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
