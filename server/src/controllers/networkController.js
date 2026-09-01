import Student from '../models/Student.js';
import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { asyncHandler, NotFoundError, ValidationError } from '../utils/errors.js';
import { checkWiFiEligibility, createWiFiAttendance } from '../services/wifiAttendanceService.js';
import { registerOrUpdateDevice } from '../services/deviceService.js';
import { createWiFiSession } from '../services/wifiSessionService.js';
import AuditLog from '../models/AuditLog.js';
import logger from '../config/logger.js';

/**
 * Network authentication controller for Wi-Fi gateway integration
 * Handles student authentication and automatic attendance creation
 */
export const authenticateNetworkController = asyncHandler(async (req, res) => {
  const { credentials, device, session } = req.body;
  const { mobile, studentId } = credentials;

  try {
    // Normalize mobile number
    const normalizedMobile = mobile.replace(/\D/g, '');
    const mobileWithCountry = normalizedMobile.length === 10 ? `91${normalizedMobile}` : normalizedMobile;

    // Find user by mobile number
    const user = await User.findOne({ 
      normalizedMobile: mobileWithCountry,
      role: 'student'
    });

    if (!user) {
      logger.warn(`[NetworkAuth] User not found for mobile: ${mobileWithCountry}`);
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Verify student ID matches
    const student = await Student.findById(user.studentRef);
    if (!student || student.studentId !== studentId) {
      logger.warn(`[NetworkAuth] Student ID mismatch for user: ${user._id}`);
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Check Wi-Fi eligibility using existing membership service
    const eligibility = await checkWiFiEligibility(student._id);
    
    if (!eligibility.eligible) {
      logger.info(`[NetworkAuth] Access denied for student ${studentId}: ${eligibility.reason}`);
      
      // Log failed authentication attempt
      await AuditLog.create({
        action: 'network_auth_denied',
        actorId: null,
        actorRole: 'system',
        actorName: 'Wi-Fi Gateway',
        targetType: 'Student',
        targetId: student._id.toString(),
        targetName: student.name,
        details: {
          reason: eligibility.reason,
          mobile: mobileWithCountry,
          deviceId: device?.macAddress,
          ipAddress: device?.ipAddress
        }
      });

      return errorResponse(res, {
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: eligibility.reason,
          details: eligibility.reason
        }
      }, 403);
    }

    // Register or update device
    const deviceResult = await registerOrUpdateDevice(
      student._id,
      {
        name: device?.name || 'Unknown Device',
        type: device?.type || 'other',
        platform: device?.platform || ''
      },
      {
        macAddress: device?.macAddress || '',
        userAgent: device?.userAgent || ''
      },
      null // System-generated registration
    );

    if (!deviceResult.success) {
      logger.warn(`[NetworkAuth] Device registration failed for student ${studentId}: ${deviceResult.code}`);
      
      // Log device registration failure
      await AuditLog.create({
        action: 'network_auth_denied',
        actorId: null,
        actorRole: 'system',
        actorName: 'Wi-Fi Gateway',
        targetType: 'Student',
        targetId: student._id.toString(),
        targetName: student.name,
        details: {
          reason: deviceResult.code,
          mobile: mobileWithCountry,
          deviceId: device?.macAddress,
          ipAddress: device?.ipAddress
        }
      });

      return errorResponse(res, {
        success: false,
        error: {
          code: deviceResult.code,
          message: deviceResult.message || deviceResult.code
        }
      }, deviceResult.code === 'DEVICE_LIMIT_REACHED' ? 403 : 500);
    }

    // Create Wi-Fi session (handles attendance internally)
    const sessionResult = await createWiFiSession({
      studentId: student._id,
      deviceId: deviceResult.device.deviceId,
      gatewayId: req.headers['x-gateway-id'] || 'unknown',
      ipAddress: device?.ipAddress || '',
      connectionType: 'wifi'
    });

    if (!sessionResult.success) {
      logger.warn(`[NetworkAuth] Session creation failed for student ${studentId}: ${sessionResult.code}`);
      
      return errorResponse(res, {
        success: false,
        error: {
          code: sessionResult.code,
          message: sessionResult.code
        }
      }, 500);
    }

    // Log successful authentication
    await AuditLog.create({
      action: 'network_auth_success',
      actorId: null,
      actorRole: 'system',
      actorName: 'Wi-Fi Gateway',
      targetType: 'Student',
      targetId: student._id.toString(),
      targetName: student.name,
      details: {
        sessionAction: sessionResult.action,
        sessionId: sessionResult.session.sessionId,
        deviceId: deviceResult.device.deviceId,
        gatewayId: req.headers['x-gateway-id'] || 'unknown'
      }
    });

    // Return success with session, device, and attendance information
    return successResponse(res, {
      success: true,
      data: {
        studentId: student.studentId,
        studentName: student.name,
        membership: {
          status: eligibility.membership.status,
          expiryDate: eligibility.membership.expiryDate
        },
        session: {
          action: sessionResult.action,
          sessionId: sessionResult.session.sessionId,
          token: sessionResult.token,
          expiresAt: sessionResult.session.expiresAt
        },
        device: {
          action: deviceResult.action,
          deviceId: deviceResult.device.deviceId,
          deviceType: deviceResult.device.deviceInfo.type
        },
        attendance: {
          created: sessionResult.session.attendance.created,
          attendanceId: sessionResult.session.attendance.attendanceId
        }
      }
    }, 'Network authentication successful');

  } catch (error) {
    logger.error('[NetworkAuth] Authentication error:', error.message);
    return errorResponse(res, {
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Authentication system error'
      }
    }, 500);
  }
});