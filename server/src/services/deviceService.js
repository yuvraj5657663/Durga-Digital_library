import { v4 as uuidv4 } from 'uuid';
import RegisteredDevice from '../models/RegisteredDevice.js';
import Student from '../models/Student.js';
import { getActive } from './membershipService.js';
import AuditLog from '../models/AuditLog.js';
import logger from '../config/logger.js';
import config from '../config/index.js';
import { toActorId } from '../utils/actorId.js';

/**
 * Generate a unique device ID
 * Server-side generated, NOT based on MAC address
 */
function generateDeviceId() {
  return `DEV-${uuidv4().replace(/-/g, '').toUpperCase()}`;
}

/**
 * Check if student has reached device limit
 */
async function checkDeviceLimit(studentId) {
  const maxDevices = config.wifi.maxDevicesPerStudent;
  
  const activeDeviceCount = await RegisteredDevice.countDocuments({
    student: studentId,
    status: 'active'
  });
  
  return {
    allowed: activeDeviceCount < maxDevices,
    currentCount: activeDeviceCount,
    maxDevices,
    remainingSlots: maxDevices - activeDeviceCount
  };
}

/**
 * Find existing device by fingerprint
 * Uses multiple attributes for matching, not just MAC
 * MAC address is treated as a hint, not identity
 */
async function findDeviceByFingerprint(studentId, fingerprint) {
  const { macAddress, userAgent } = fingerprint;
  
  // Try to find by MAC address first (if provided)
  if (macAddress) {
    const deviceByMac = await RegisteredDevice.findOne({
      student: studentId,
      'deviceFingerprint.macAddress': macAddress
    });
    if (deviceByMac) return deviceByMac;
  }
  
  // Try to find by user agent (if provided)
  if (userAgent) {
    const deviceByUA = await RegisteredDevice.findOne({
      student: studentId,
      'deviceFingerprint.userAgent': userAgent
    });
    if (deviceByUA) return deviceByUA;
  }
  
  return null;
}

/**
 * Register or update device during Wi-Fi authentication
 * This is called after successful authentication and membership validation
 */
async function registerOrUpdateDevice(studentId, deviceInfo, fingerprint, registeredBy = null) {
  try {
    // Check student eligibility first
    const student = await Student.findById(studentId);
    if (!student) {
      return {
        success: false,
        code: 'STUDENT_NOT_FOUND',
        device: null
      };
    }
    
    if (student.status !== 'Active') {
      return {
        success: false,
        code: 'STUDENT_INACTIVE',
        device: null
      };
    }
    
    // Check membership
    const membership = await getActive(studentId);
    if (!membership) {
      return {
        success: false,
        code: 'NO_ACTIVE_MEMBERSHIP',
        device: null
      };
    }
    
    // Try to find existing device
    const existingDevice = await findDeviceByFingerprint(studentId, fingerprint);
    
    if (existingDevice) {
      // Update existing device
      if (existingDevice.status === 'active') {
        existingDevice.deviceInfo.lastSeen = new Date();
        existingDevice.security.lastSecurityCheck = new Date();
        await existingDevice.save();
        
        logger.info(`[deviceService] Device updated for student ${studentId}: ${existingDevice.deviceId}`);
        
        return {
          success: true,
          action: 'updated',
          device: existingDevice
        };
      } else {
        // Device is revoked/suspended, don't auto-reactivate
        return {
          success: false,
          code: existingDevice.status === 'revoked' ? 'DEVICE_REVOKED' : 'DEVICE_SUSPENDED',
          device: existingDevice
        };
      }
    }
    
    // Check device limit
    const limitCheck = await checkDeviceLimit(studentId);
    if (!limitCheck.allowed) {
      logger.warn(`[deviceService] Device limit reached for student ${studentId}: ${limitCheck.currentCount}/${limitCheck.maxDevices}`);
      
      await AuditLog.create({
        action: 'device_limit_reached',
        actorId: toActorId(registeredBy),
        actorRole: registeredBy ? 'user' : 'system',
        actorName: registeredBy?.name || 'Wi-Fi Auth',
        targetType: 'RegisteredDevice',
        targetId: studentId,
        targetName: student.name,
        details: {
          currentCount: limitCheck.currentCount,
          maxDevices: limitCheck.maxDevices,
          fingerprint
        }
      });
      
      return {
        success: false,
        code: 'DEVICE_LIMIT_REACHED',
        message: `Maximum registered devices reached (${limitCheck.maxDevices})`,
        device: null
      };
    }
    
    // Create new device
    const deviceId = generateDeviceId();
    const newDevice = await RegisteredDevice.create({
      deviceId,
      student: studentId,
      deviceInfo: {
        name: deviceInfo.name || 'Unknown Device',
        type: deviceInfo.type || 'other',
        platform: deviceInfo.platform || '',
        firstSeen: new Date(),
        lastSeen: new Date()
      },
      deviceFingerprint: {
        macAddress: fingerprint.macAddress || '',
        userAgent: fingerprint.userAgent || ''
      },
      status: 'active',
      registration: {
        method: 'wifi_auth',
        registeredAt: new Date(),
        registeredBy: toActorId(registeredBy)
      },
      security: {
        trustScore: 100,
        riskFlags: [],
        lastSecurityCheck: new Date()
      }
    });
    
    // Log device registration
    await AuditLog.create({
      action: 'device_registered',
      actorId: toActorId(registeredBy),
      actorRole: registeredBy ? 'user' : 'system',
      actorName: registeredBy?.name || 'Wi-Fi Auth',
      targetType: 'RegisteredDevice',
      targetId: newDevice._id.toString(),
      targetName: deviceId,
      details: {
        studentId: student.studentId,
        studentName: student.name,
        deviceType: deviceInfo.type,
        method: 'wifi_auth'
      }
    });
    
    logger.info(`[deviceService] New device registered for student ${studentId}: ${deviceId}`);
    
    return {
      success: true,
      action: 'created',
      device: newDevice
    };
    
  } catch (error) {
    logger.error('[deviceService] Device registration error:', error.message);
    return {
      success: false,
      code: 'SYSTEM_ERROR',
      error: error.message,
      device: null
    };
  }
}

/**
 * Validate registered device for access
 * Checks device status, ownership, and membership
 */
async function validateRegisteredDevice(studentId, deviceId) {
  try {
    // Check student
    const student = await Student.findById(studentId);
    if (!student) {
      return {
        success: false,
        authorized: false,
        code: 'STUDENT_NOT_FOUND',
        device: null
      };
    }
    
    if (student.status !== 'Active') {
      return {
        success: false,
        authorized: false,
        code: 'STUDENT_INACTIVE',
        device: null
      };
    }
    
    // Check device
    const device = await RegisteredDevice.findOne({ deviceId });
    if (!device) {
      return {
        success: false,
        authorized: false,
        code: 'DEVICE_NOT_FOUND',
        device: null
      };
    }
    
    // Check device ownership
    if (device.student.toString() !== studentId) {
      logger.warn(`[deviceService] Ownership mismatch: device ${deviceId} belongs to ${device.student}, not ${studentId}`);
      
      await AuditLog.create({
        action: 'device_access_denied',
        actorId: null,
        actorRole: 'system',
        actorName: 'Device Validation',
        targetType: 'RegisteredDevice',
        targetId: device._id.toString(),
        targetName: deviceId,
        details: {
          reason: 'OWNERSHIP_MISMATCH',
          requestedBy: studentId,
          actualOwner: device.student.toString()
        }
      });
      
      return {
        success: false,
        authorized: false,
        code: 'DEVICE_NOT_OWNED',
        device: null
      };
    }
    
    // Check device status
    if (device.status !== 'active') {
      const code = device.status === 'revoked' ? 'DEVICE_REVOKED' : 'DEVICE_SUSPENDED';
      
      await AuditLog.create({
        action: 'device_access_denied',
        actorId: null,
        actorRole: 'system',
        actorName: 'Device Validation',
        targetType: 'RegisteredDevice',
        targetId: device._id.toString(),
        targetName: deviceId,
        details: {
          reason: code,
          deviceStatus: device.status
        }
      });
      
      return {
        success: false,
        authorized: false,
        code,
        device
      };
    }
    
    // Check membership
    const membership = await getActive(studentId);
    if (!membership) {
      return {
        success: false,
        authorized: false,
        code: 'NO_ACTIVE_MEMBERSHIP',
        device
      };
    }
    
    // All checks passed
    return {
      success: true,
      authorized: true,
      device
    };
    
  } catch (error) {
    logger.error('[deviceService] Device validation error:', error.message);
    return {
      success: false,
      authorized: false,
      code: 'SYSTEM_ERROR',
      error: error.message,
      device: null
    };
  }
}

/**
 * Revoke a device
 * Student can revoke their own device, admin can revoke any device
 */
async function revokeDevice(studentId, deviceId, revokedBy) {
  try {
    const device = await RegisteredDevice.findOne({ deviceId });
    if (!device) {
      return {
        success: false,
        code: 'DEVICE_NOT_FOUND'
      };
    }
    
    // Authorization check
    const actorRole = revokedBy?.role || 'system';
    const isOwner = device.student.toString() === studentId;
    const isAdmin = actorRole === 'admin';
    
    if (!isAdmin && !isOwner) {
      logger.warn(`[deviceService] Unauthorized revocation attempt: user ${revokedBy?.id} trying to revoke device ${deviceId}`);
      
      return {
        success: false,
        code: 'UNAUTHORIZED'
      };
    }
    
    // Revoke device
    device.status = 'revoked';
    await device.save();
    
    // Get student info for audit log
    const student = await Student.findById(device.student);
    
    await AuditLog.create({
      action: 'device_revoked',
      actorId: toActorId(revokedBy?.id),
      actorRole: actorRole,
      actorName: revokedBy?.name || 'System',
      targetType: 'RegisteredDevice',
      targetId: device._id.toString(),
      targetName: deviceId,
      details: {
        studentId: student?.studentId,
        studentName: student?.name,
        revokedBy: isAdmin ? 'admin' : 'student'
      }
    });
    
    logger.info(`[deviceService] Device ${deviceId} revoked by ${actorRole}`);
    
    return {
      success: true,
      device
    };
    
  } catch (error) {
    logger.error('[deviceService] Device revocation error:', error.message);
    return {
      success: false,
      code: 'SYSTEM_ERROR',
      error: error.message
    };
  }
}

/**
 * Get all devices for a student
 */
async function getStudentDevices(studentId) {
  try {
    const devices = await RegisteredDevice.find({ student: studentId })
      .sort({ createdAt: -1 });
    
    return {
      success: true,
      devices
    };
  } catch (error) {
    logger.error('[deviceService] Get devices error:', error.message);
    return {
      success: false,
      code: 'SYSTEM_ERROR',
      error: error.message,
      devices: []
    };
  }
}

/**
 * Suspend a device (admin only)
 */
async function suspendDevice(deviceId, suspendedBy) {
  try {
    const device = await RegisteredDevice.findOne({ deviceId });
    if (!device) {
      return {
        success: false,
        code: 'DEVICE_NOT_FOUND'
      };
    }
    
    device.status = 'suspended';
    await device.save();
    
    const student = await Student.findById(device.student);
    
    await AuditLog.create({
      action: 'device_suspended',
      actorId: toActorId(suspendedBy?.id),
      actorRole: 'admin',
      actorName: suspendedBy?.name || 'System',
      targetType: 'RegisteredDevice',
      targetId: device._id.toString(),
      targetName: deviceId,
      details: {
        studentId: student?.studentId,
        studentName: student?.name
      }
    });
    
    logger.info(`[deviceService] Device ${deviceId} suspended by admin`);
    
    return {
      success: true,
      device
    };
    
  } catch (error) {
    logger.error('[deviceService] Device suspension error:', error.message);
    return {
      success: false,
      code: 'SYSTEM_ERROR',
      error: error.message
    };
  }
}

/**
 * Restore a suspended device (admin only)
 */
async function restoreDevice(deviceId, restoredBy) {
  try {
    const device = await RegisteredDevice.findOne({ deviceId });
    if (!device) {
      return {
        success: false,
        code: 'DEVICE_NOT_FOUND'
      };
    }
    
    if (device.status !== 'suspended') {
      return {
        success: false,
        code: 'DEVICE_NOT_SUSPENDED'
      };
    }
    
    device.status = 'active';
    await device.save();
    
    const student = await Student.findById(device.student);
    
    await AuditLog.create({
      action: 'device_restored',
      actorId: toActorId(restoredBy?.id),
      actorRole: 'admin',
      actorName: restoredBy?.name || 'System',
      targetType: 'RegisteredDevice',
      targetId: device._id.toString(),
      targetName: deviceId,
      details: {
        studentId: student?.studentId,
        studentName: student?.name
      }
    });
    
    logger.info(`[deviceService] Device ${deviceId} restored by admin`);
    
    return {
      success: true,
      device
    };
    
  } catch (error) {
    logger.error('[deviceService] Device restoration error:', error.message);
    return {
      success: false,
      code: 'SYSTEM_ERROR',
      error: error.message
    };
  }
}

export {
  registerOrUpdateDevice,
  validateRegisteredDevice,
  revokeDevice,
  getStudentDevices,
  suspendDevice,
  restoreDevice,
  checkDeviceLimit
};
