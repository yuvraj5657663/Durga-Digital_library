jest.mock('../src/models/User.js', () => ({
  findOne: jest.fn()
}));
jest.mock('../src/models/PasswordResetOtp.js', () => ({
  updateMany: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn()
}));
jest.mock('../src/config/logger.js', () => ({
  warn: jest.fn(),
  error: jest.fn()
}));
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: jest.fn().mockResolvedValue({}) }))
}));
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password')
}));

import User from '../src/models/User.js';
import PasswordResetOtp from '../src/models/PasswordResetOtp.js';
import { requestPasswordReset, resetPasswordWithOtp } from '../src/services/passwordResetService.js';

describe('password reset service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not reveal whether an email exists', async () => {
    User.findOne.mockResolvedValue(null);

    const result = await requestPasswordReset('missing@example.com');

    expect(result.message).toContain('If an account exists');
    expect(PasswordResetOtp.create).not.toHaveBeenCalled();
  });

  it('counts invalid OTP attempts', async () => {
    const reset = {
      codeHash: 'different',
      attempts: 0,
      maxAttempts: 5,
      save: jest.fn()
    };
    PasswordResetOtp.findOne.mockReturnValue({ sort: jest.fn().mockResolvedValue(reset) });

    await expect(resetPasswordWithOtp('user@example.com', '123456', 'new-password')).rejects.toThrow('Invalid or expired reset code');
    expect(reset.attempts).toBe(1);
    expect(reset.save).toHaveBeenCalled();
  });

  it('hashes the new password and invalidates the OTP after success', async () => {
    const reset = {
      codeHash: '5994471abb01112afcc18159f6cc74b4f511b99806da59e0d3e7e1a8c5d3c4a',
      attempts: 0,
      maxAttempts: 5,
      user: 'user-id',
      save: jest.fn()
    };
    // SHA-256 of 123456 is compared by the service; replace with the real value at runtime through the test setup.
    const crypto = await import('crypto');
    reset.codeHash = crypto.createHash('sha256').update('123456').digest('hex');
    PasswordResetOtp.findOne.mockReturnValue({ sort: jest.fn().mockResolvedValue(reset) });
    const user = { passwordHash: 'old', refreshTokens: ['old'], save: jest.fn() };
    User.findOne.mockResolvedValue(user);

    await expect(resetPasswordWithOtp('user@example.com', '123456', 'new-password')).resolves.toEqual({ success: true });
    expect(user.passwordHash).toBe('hashed-password');
    expect(user.refreshTokens).toEqual([]);
    expect(reset.usedAt).toBeInstanceOf(Date);
    expect(reset.save).toHaveBeenCalled();
  });
});
