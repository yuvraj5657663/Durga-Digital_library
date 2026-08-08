import { login, refreshToken, registerStudent, changePassword } from '../services/authService.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/errors.js';
import logger from '../config/logger.js';

export const loginController = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];

  const result = await login(username, password, ip, userAgent);
  return successResponse(res, result, 'Login successful');
});

export const refreshTokenController = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await refreshToken(refreshToken);
  return successResponse(res, result, 'Token refreshed');
});

export const logoutController = asyncHandler(async (req, res) => {
  return successResponse(res, null, 'Logged out successfully');
});

export const meController = asyncHandler(async (req, res) => {
  return successResponse(res, req.user, 'User info retrieved');
});

export const registerController = asyncHandler(async (req, res) => {
  const userData = req.body;
  const user = await registerStudent(userData);
  return successResponse(res, user, 'Registration successful', 201);
});

export const changePasswordController = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;
  
  const result = await changePassword(userId, currentPassword, newPassword);
  return successResponse(res, result, 'Password changed successfully');
});
