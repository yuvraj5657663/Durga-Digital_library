import { successResponse, errorResponse } from '../utils/response.js';
import { asyncHandler, NotFoundError, ValidationError } from '../utils/errors.js';
import {
  getStudentDevices,
  revokeDevice,
  suspendDevice,
  restoreDevice
} from '../services/deviceService.js';
import Student from '../models/Student.js';
import AuditLog from '../models/AuditLog.js';
import logger from '../config/logger.js';
import { toActorId } from '../utils/actorId.js';

/**
 * Get all devices for the authenticated student
 */
export const getStudentDevicesController = asyncHandler(async (req, res) => {
  const studentId = req.user.studentRef;
  
  const result = await getStudentDevices(studentId);
  
  if (!result.success) {
    return errorResponse(res, {
      success: false,
      code: result.code,
      message: result.error || 'Failed to retrieve devices'
    }, 500);
  }
  
  return successResponse(res, result.devices, 'Devices retrieved successfully');
});

/**
 * Revoke a device (student can revoke their own devices)
 */
export const revokeDeviceController = asyncHandler(async (req, res) => {
  const { deviceId } = req.params;
  const studentId = req.user.studentRef;
  
  const result = await revokeDevice(studentId, deviceId, req.user);
  
  if (!result.success) {
    const statusCode = result.code === 'UNAUTHORIZED' ? 403 : 404;
    return errorResponse(res, {
      success: false,
      code: result.code,
      message: result.code === 'DEVICE_NOT_FOUND' ? 'Device not found' : result.code
    }, statusCode);
  }
  
  return successResponse(res, result.device, 'Device revoked successfully');
});

/**
 * Suspend a device (admin only)
 */
export const suspendDeviceController = asyncHandler(async (req, res) => {
  const { deviceId } = req.params;
  
  const result = await suspendDevice(deviceId, req.user);
  
  if (!result.success) {
    const statusCode = result.code === 'DEVICE_NOT_FOUND' ? 404 : 500;
    return errorResponse(res, {
      success: false,
      code: result.code,
      message: result.code === 'DEVICE_NOT_FOUND' ? 'Device not found' : 'Failed to suspend device'
    }, statusCode);
  }
  
  return successResponse(res, result.device, 'Device suspended successfully');
});

/**
 * Restore a suspended device (admin only)
 */
export const restoreDeviceController = asyncHandler(async (req, res) => {
  const { deviceId } = req.params;
  
  const result = await restoreDevice(deviceId, req.user);
  
  if (!result.success) {
    const statusCode = result.code === 'DEVICE_NOT_FOUND' ? 404 : 400;
    return errorResponse(res, {
      success: false,
      code: result.code,
      message: result.code === 'DEVICE_NOT_FOUND' ? 'Device not found' : 
                 result.code === 'DEVICE_NOT_SUSPENDED' ? 'Device is not suspended' : 'Failed to restore device'
    }, statusCode);
  }
  
  return successResponse(res, result.device, 'Device restored successfully');
});

/**
 * Get device details (admin only)
 */
export const getDeviceController = asyncHandler(async (req, res) => {
  const { deviceId } = req.params;
  const RegisteredDevice = (await import('../models/RegisteredDevice.js')).default;
  
  const device = await RegisteredDevice.findOne({ deviceId })
    .populate('student', 'name studentId mobile email')
    .populate('registration.registeredBy', 'name username');
  
  if (!device) {
    throw new NotFoundError('Device not found');
  }
  
  return successResponse(res, device, 'Device retrieved successfully');
});

/**
 * Get all devices with pagination (admin only)
 */
export const getAllDevicesController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status, studentId } = req.query;
  const RegisteredDevice = (await import('../models/RegisteredDevice.js')).default;
  
  const filter = {};
  if (status) filter.status = status;
  if (studentId) {
    const student = await Student.findOne({ studentId });
    if (student) filter.student = student._id;
  }
  
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  
  const [devices, total] = await Promise.all([
    RegisteredDevice.find(filter)
      .populate('student', 'name studentId mobile email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10)),
    RegisteredDevice.countDocuments(filter)
  ]);
  
  return successResponse(res, {
    devices,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total
    }
  }, 'Devices retrieved successfully');
});
