import { successResponse, errorResponse } from '../utils/response.js';
import { asyncHandler, NotFoundError, ValidationError } from '../utils/errors.js';
import {
  linkDeviceToStudent,
  unlinkDeviceFromStudent,
  getDeviceStudentInfo,
  getAllRegisteredDevices
} from '../services/registeredNetworkDeviceService.js';
import logger from '../config/logger.js';

/**
 * Link a network device to a student (admin only)
 */
export const linkDeviceController = asyncHandler(async (req, res) => {
  const { networkDeviceId } = req.params;
  const { studentId, deviceLabel, notes } = req.body;

  if (!studentId) {
    throw new ValidationError('studentId is required');
  }

  const result = await linkDeviceToStudent(networkDeviceId, studentId, {
    deviceLabel,
    notes,
    registeredBy: req.user
  });

  if (!result.success) {
    const statusCode = result.code === 'NETWORK_DEVICE_NOT_FOUND' || result.code === 'STUDENT_NOT_FOUND' 
      ? 404 
      : result.code === 'DEVICE_LIMIT_REACHED' || result.code === 'DEVICE_ALREADY_LINKED'
      ? 400
      : 500;

    return errorResponse(res, {
      success: false,
      code: result.code,
      message: result.message || 'Failed to link device'
    }, statusCode);
  }

  return successResponse(res, result.registeredDevice, 'Device linked successfully');
});

/**
 * Unlink a network device from a student (admin only)
 */
export const unlinkDeviceController = asyncHandler(async (req, res) => {
  const { networkDeviceId } = req.params;

  const result = await unlinkDeviceFromStudent(networkDeviceId, req.user);

  if (!result.success) {
    const statusCode = result.code === 'REGISTRATION_NOT_FOUND' ? 404 : 500;
    return errorResponse(res, {
      success: false,
      code: result.code,
      message: result.message || 'Failed to unlink device'
    }, statusCode);
  }

  return successResponse(res, result.registeredDevice, 'Device unlinked successfully');
});

/**
 * Get student information for a network device (admin only)
 */
export const getDeviceStudentInfoController = asyncHandler(async (req, res) => {
  const { networkDeviceId } = req.params;

  const result = await getDeviceStudentInfo(networkDeviceId);

  if (!result.success) {
    return errorResponse(res, {
      success: false,
      error: result.error
    }, 500);
  }

  return successResponse(res, {
    linked: result.linked,
    student: result.student,
    registeredDevice: result.registeredDevice
  }, 'Device student info retrieved successfully');
});

/**
 * Get all registered devices (admin only)
 */
export const getAllRegisteredDevicesController = asyncHandler(async (req, res) => {
  const { page, limit, status, studentId } = req.query;

  const result = await getAllRegisteredDevices({ page, limit, status, studentId });

  if (!result.success) {
    return errorResponse(res, {
      success: false,
      error: result.error
    }, 500);
  }

  return successResponse(res, result, 'Registered devices retrieved successfully');
});
