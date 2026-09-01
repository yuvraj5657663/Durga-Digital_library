import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getActive } from './membershipService.js';
import { validateRegisteredDevice } from './deviceService.js';
import { createWiFiAttendance } from './wifiAttendanceService.js';
import gatewayService from './gatewayService.js';
import AuditLog from '../models/AuditLog.js';
import logger from '../config/logger.js';
import config from '../config/index.js';
import { toActorId } from '../utils/actorId.js';
import {
  wifiSessionRepository,
  registeredDeviceRepository,
  studentRepository
} from '../repositories/index.js';

/**
 * Generate a unique session ID
 */
function generateSessionId() {
  return `WFS-${uuidv4().replace(/-/g, '').toUpperCase()}`;
}

/**
 * Hash a token for storage (never store raw tokens)
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create a Wi-Fi JWT token with dedicated scope
 * This token is separate from normal student/admin JWTs
 */
function createWiFiToken(payload) {
  const token = jwt.sign(
    {
      sub: payload.studentId,
      sessionId: payload.sessionId,
      deviceId: payload.deviceId,
      gatewayId: payload.gatewayId,
      scope: 'wifi',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (config.wifi.sessionDurationMinutes * 60)
    },
    config.jwt.secret,
    { algorithm: 'HS256' }
  );
  return token;
}

/**
 * Create a new Wi-Fi session
 * Performs all necessary validations before session creation
 */
async function createWiFiSession({ studentId, deviceId, gatewayId, ipAddress, connectionType = 'wifi' }) {
  try {
    // 1. Verify student exists
    const student = await studentRepository.findById(studentId);
    if (!student) {
      return {
        success: false,
        code: 'STUDENT_NOT_FOUND',
        session: null,
        token: null
      };
    }

    // 2. Verify student status
    if (student.status !== 'Active') {
      logger.warn(`[wifiSessionService] Inactive student ${studentId} attempted session creation`);
      
      await AuditLog.create({
        action: 'wifi_session_denied',
        actorId: null,
        actorRole: 'system',
        actorName: 'Wi-Fi Session',
        targetType: 'WiFiSession',
        targetId: studentId,
        targetName: student.name,
        details: {
          reason: 'STUDENT_INACTIVE',
          studentId: student.studentId
        }
      });
      
      return {
        success: false,
        code: 'STUDENT_INACTIVE',
        session: null,
        token: null
      };
    }

    // 3. Verify active membership
    const membership = await getActive(studentId);
    if (!membership) {
      logger.warn(`[wifiSessionService] No active membership for student ${studentId}`);
      
      await AuditLog.create({
        action: 'wifi_session_denied',
        actorId: null,
        actorRole: 'system',
        actorName: 'Wi-Fi Session',
        targetType: 'WiFiSession',
        targetId: studentId,
        targetName: student.name,
        details: {
          reason: 'NO_ACTIVE_MEMBERSHIP',
          studentId: student.studentId
        }
      });
      
      return {
        success: false,
        code: 'NO_ACTIVE_MEMBERSHIP',
        session: null,
        token: null
      };
    }

    // 4. Verify registered device belongs to student and is active
    const deviceValidation = await validateRegisteredDevice(studentId, deviceId);
    if (!deviceValidation.authorized) {
      logger.warn(`[wifiSessionService] Device validation failed for student ${studentId}: ${deviceValidation.code}`);
      
      await AuditLog.create({
        action: 'wifi_session_denied',
        actorId: null,
        actorRole: 'system',
        actorName: 'Wi-Fi Session',
        targetType: 'WiFiSession',
        targetId: studentId,
        targetName: student.name,
        details: {
          reason: deviceValidation.code,
          deviceId,
          studentId: student.studentId
        }
      });
      
      return {
        success: false,
        code: deviceValidation.code,
        session: null,
        token: null
      };
    }

    const device = deviceValidation.device;

    // 5. Verify gateway is trusted (basic check - can be enhanced)
    if (!gatewayId || gatewayId === 'unknown') {
      logger.warn(`[wifiSessionService] Untrusted or missing gateway ID for student ${studentId}`);
      
      return {
        success: false,
        code: 'GATEWAY_UNTRUSTED',
        session: null,
        token: null
      };
    }

    // 6. Check for existing active session for this device
    const existingSession = await wifiSessionRepository.findActiveByDevice(device._id);

    if (existingSession) {
      // Update last activity and return existing session
      await wifiSessionRepository.updateLastActivity(existingSession.sessionId);
      
      logger.info(`[wifiSessionService] Reusing existing session ${existingSession.sessionId} for student ${studentId}`);
      
      // Generate new token for existing session
      const token = createWiFiToken({
        studentId: student._id.toString(),
        sessionId: existingSession.sessionId,
        deviceId: device.deviceId,
        gatewayId
      });
      
      // Update token hash
      await wifiSessionRepository.updateTokenHash(existingSession.sessionId, hashToken(token));
      
      await AuditLog.create({
        action: 'wifi_session_restored',
        actorId: null,
        actorRole: 'system',
        actorName: 'Wi-Fi Session',
        targetType: 'WiFiSession',
        targetId: existingSession._id.toString(),
        targetName: existingSession.sessionId,
        details: {
          studentId: student.studentId,
          studentName: student.name,
          deviceId: device.deviceId
        }
      });
      
      return {
        success: true,
        action: 'restored',
        session: existingSession,
        token
      };
    }

    // 7. Create new session
    const sessionId = generateSessionId();
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + config.wifi.sessionDurationMinutes * 60 * 1000);
    
    const session = await wifiSessionRepository.createSession({
      sessionId,
      student: student._id,
      device: device._id,
      gatewayId,
      startedAt,
      expiresAt,
      lastActivityAt: startedAt,
      network: {
        ipAddress: ipAddress || '',
        connectionType
      },
      attendance: {
        created: false
      }
    });

    // 8. Create Wi-Fi JWT token
    const token = createWiFiToken({
      studentId: student._id.toString(),
      sessionId,
      deviceId: device.deviceId,
      gatewayId
    });

    // 9. Store token hash
    await wifiSessionRepository.updateTokenHash(sessionId, hashToken(token));

    // 10. Create attendance (idempotent)
    const attendanceResult = await createWiFiAttendance(student._id, {
      sessionId,
      deviceId: device.deviceId,
      ipAddress,
      gatewayId,
      networkVerified: true
    });

    if (attendanceResult.success) {
      await wifiSessionRepository.updateAttendance(sessionId, attendanceResult.attendance._id, true);
    }

    // 11. Log session creation
    await AuditLog.create({
      action: 'wifi_session_created',
      actorId: null,
      actorRole: 'system',
      actorName: 'Wi-Fi Session',
      targetType: 'WiFiSession',
      targetId: session._id.toString(),
      targetName: sessionId,
      details: {
        studentId: student.studentId,
        studentName: student.name,
        deviceId: device.deviceId,
        gatewayId,
        expiresAt: expiresAt.toISOString()
      }
    });

    logger.info(`[wifiSessionService] Session ${sessionId} created for student ${studentId}`);

    return {
      success: true,
      action: 'created',
      session,
      token
    };

  } catch (error) {
    logger.error('[wifiSessionService] Session creation error:', error.message);
    return {
      success: false,
      code: 'SYSTEM_ERROR',
      error: error.message,
      session: null,
      token: null
    };
  }
}

/**
 * Validate a Wi-Fi session
 * Performs comprehensive validation of token, session, device, student, and membership
 */
async function validateWiFiSession(token, sessionId) {
  try {
    // 1. Verify token signature and decode
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return {
          success: false,
          authorized: false,
          code: 'TOKEN_EXPIRED',
          session: null
        };
      }
      return {
        success: false,
        authorized: false,
        code: 'TOKEN_INVALID',
        session: null
      };
    }

    // 2. Verify scope is 'wifi'
    if (decoded.scope !== 'wifi') {
      logger.warn(`[wifiSessionService] Invalid token scope: ${decoded.scope}`);
      
      return {
        success: false,
        authorized: false,
        code: 'INVALID_SCOPE',
        session: null
      };
    }

    // 3. Verify sessionId matches
    if (decoded.sessionId !== sessionId) {
      logger.warn(`[wifiSessionService] Session ID mismatch: token ${decoded.sessionId} vs request ${sessionId}`);
      
      return {
        success: false,
        authorized: false,
        code: 'SESSION_MISMATCH',
        session: null
      };
    }

    // 4. Find session in database
    const session = await wifiSessionRepository.findBySessionId(sessionId);
    if (!session) {
      logger.warn(`[wifiSessionService] Session not found: ${sessionId}`);
      
      await AuditLog.create({
        action: 'wifi_session_denied',
        actorId: null,
        actorRole: 'system',
        actorName: 'Wi-Fi Session',
        targetType: 'WiFiSession',
        targetId: sessionId,
        targetName: sessionId,
        details: {
          reason: 'SESSION_NOT_FOUND'
        }
      });
      
      return {
        success: false,
        authorized: false,
        code: 'SESSION_NOT_FOUND',
        session: null
      };
    }

    // 5. Verify session status
    if (session.status !== 'active') {
      const code = session.status === 'expired' ? 'SESSION_EXPIRED' : 'SESSION_REVOKED';
      
      await AuditLog.create({
        action: 'wifi_session_denied',
        actorId: null,
        actorRole: 'system',
        actorName: 'Wi-Fi Session',
        targetType: 'WiFiSession',
        targetId: session._id.toString(),
        targetName: sessionId,
        details: {
          reason: code,
          sessionStatus: session.status
        }
      });
      
      return {
        success: false,
        authorized: false,
        code,
        session
      };
    }

    // 6. Verify session has not expired
    if (session.expiresAt < new Date()) {
      // Auto-expire the session
      await wifiSessionRepository.updateStatus(sessionId, 'expired');
      
      await AuditLog.create({
        action: 'wifi_session_expired',
        actorId: null,
        actorRole: 'system',
        actorName: 'Wi-Fi Session',
        targetType: 'WiFiSession',
        targetId: session._id.toString(),
        targetName: sessionId,
        details: {
          expiredAt: new Date().toISOString()
        }
      });
      
      return {
        success: false,
        authorized: false,
        code: 'SESSION_EXPIRED',
        session
      };
    }

    // 7. Verify registered device exists and is active
    const device = await registeredDeviceRepository.findById(session.device);
    if (!device || device.status !== 'active') {
      logger.warn(`[wifiSessionService] Device invalid for session ${sessionId}`);
      
      // Revoke session if device is no longer active
      await wifiSessionRepository.revokeBySessionId(sessionId, 'DEVICE_INACTIVE');
      
      await AuditLog.create({
        action: 'wifi_session_revoked',
        actorId: null,
        actorRole: 'system',
        actorName: 'Wi-Fi Session',
        targetType: 'WiFiSession',
        targetId: session._id.toString(),
        targetName: sessionId,
        details: {
          reason: 'DEVICE_INACTIVE',
          deviceId: device?.deviceId
        }
      });
      
      return {
        success: false,
        authorized: false,
        code: 'DEVICE_INACTIVE',
        session
      };
    }

    // 8. Verify student status
    const student = await studentRepository.findById(session.student);
    if (!student || student.status !== 'Active') {
      logger.warn(`[wifiSessionService] Student inactive for session ${sessionId}`);
      
      await wifiSessionRepository.revokeBySessionId(sessionId, 'STUDENT_INACTIVE');
      
      await AuditLog.create({
        action: 'wifi_session_revoked',
        actorId: null,
        actorRole: 'system',
        actorName: 'Wi-Fi Session',
        targetType: 'WiFiSession',
        targetId: session._id.toString(),
        targetName: sessionId,
        details: {
          reason: 'STUDENT_INACTIVE',
          studentId: student?.studentId
        }
      });
      
      return {
        success: false,
        authorized: false,
        code: 'STUDENT_INACTIVE',
        session
      };
    }

    // 9. Verify membership is still active
    const membership = await getActive(session.student);
    if (!membership) {
      logger.warn(`[wifiSessionService] Membership expired for session ${sessionId}`);
      
      await wifiSessionRepository.revokeBySessionId(sessionId, 'MEMBERSHIP_EXPIRED');
      
      await AuditLog.create({
        action: 'wifi_session_revoked',
        actorId: null,
        actorRole: 'system',
        actorName: 'Wi-Fi Session',
        targetType: 'WiFiSession',
        targetId: session._id.toString(),
        targetName: sessionId,
        details: {
          reason: 'MEMBERSHIP_EXPIRED'
        }
      });
      
      return {
        success: false,
        authorized: false,
        code: 'MEMBERSHIP_EXPIRED',
        session
      };
    }

    // 10. Update last activity
    await wifiSessionRepository.updateLastActivity(sessionId);

    // 11. Log successful validation
    await AuditLog.create({
      action: 'wifi_session_validated',
      actorId: null,
      actorRole: 'system',
      actorName: 'Wi-Fi Session',
      targetType: 'WiFiSession',
      targetId: session._id.toString(),
      targetName: sessionId,
      details: {
        studentId: student.studentId,
        deviceId: device.deviceId
      }
    });

    return {
      success: true,
      authorized: true,
      session,
      student,
      device
    };

  } catch (error) {
    logger.error('[wifiSessionService] Session validation error:', error.message);
    return {
      success: false,
      authorized: false,
      code: 'SYSTEM_ERROR',
      error: error.message,
      session: null
    };
  }
}

/**
 * Revoke a specific Wi-Fi session
 */
async function revokeWiFiSession(sessionId, reason = 'manual_logout') {
  try {
    const session = await wifiSessionRepository.findBySessionId(sessionId);
    if (!session) {
      return {
        success: false,
        code: 'SESSION_NOT_FOUND'
      };
    }

    if (session.status !== 'active') {
      return {
        success: false,
        code: 'SESSION_ALREADY_INACTIVE'
      };
    }

    await wifiSessionRepository.revokeBySessionId(sessionId, reason);

    // Deauthorize gateway client (idempotent - safe if already deauthorized)
    try {
      await gatewayService.deauthorizeClient({
        gatewayId: session.gatewayId,
        studentId: session.student?.studentId,
        deviceId: session.device?.deviceId,
        sessionId: session.sessionId,
        clientIp: session.network?.ipAddress,
        clientMac: session.device?.deviceInfo?.macAddress
      });
    } catch (error) {
      logger.error(`[wifiSessionService] Gateway deauthorization failed for session ${sessionId}:`, error.message);
      // Continue despite gateway deauthorization failure - session is already revoked in database
    }

    const student = await Student.findById(session.student);
    
    await AuditLog.create({
      action: 'wifi_session_revoked',
      actorId: null,
      actorRole: 'system',
      actorName: 'Wi-Fi Session',
      targetType: 'WiFiSession',
      targetId: session._id.toString(),
      targetName: sessionId,
      details: {
        reason,
        studentId: student?.studentId,
        studentName: student?.name
      }
    });

    logger.info(`[wifiSessionService] Session ${sessionId} revoked: ${reason}`);

    return {
      success: true,
      session
    };

  } catch (error) {
    logger.error('[wifiSessionService] Session revocation error:', error.message);
    return {
      success: false,
      code: 'SYSTEM_ERROR',
      error: error.message
    };
  }
}

/**
 * Revoke all active sessions for a student
 * Does NOT delete student, user, membership, attendance, or device records
 */
async function revokeAllStudentSessions(studentId, reason = 'admin_action') {
  try {
    // Find sessions to deauthorize first
    const sessionsToRevoke = await wifiSessionRepository.findActiveByStudent(studentId);

    // Update status to revoked
    const result = await wifiSessionRepository.revokeAllByStudent(studentId, reason);

    // Deauthorize gateway for each revoked session
    for (const session of sessionsToRevoke) {
      try {
        await gatewayService.deauthorizeClient({
          gatewayId: session.gatewayId,
          studentId: session.student?.studentId,
          deviceId: session.device?.deviceId,
          sessionId: session.sessionId,
          clientIp: session.network?.ipAddress,
          clientMac: session.device?.deviceInfo?.macAddress
        });
      } catch (error) {
        logger.error(`[wifiSessionService] Gateway deauthorization failed for session ${session.sessionId}:`, error.message);
        // Continue despite gateway deauthorization failure
      }
    }

    const student = await Student.findById(studentId);
    
    await AuditLog.create({
      action: 'wifi_session_revoked',
      actorId: null,
      actorRole: 'system',
      actorName: 'Wi-Fi Session',
      targetType: 'WiFiSession',
      targetId: studentId,
      targetName: student?.name || 'Unknown',
      details: {
        reason,
        studentId: student?.studentId,
        sessionsRevoked: result.modifiedCount
      }
    });

    logger.info(`[wifiSessionService] Revoked ${result.modifiedCount} sessions for student ${studentId}: ${reason}`);

    return {
      success: true,
      revokedCount: result.modifiedCount
    };

  } catch (error) {
    logger.error('[wifiSessionService] Bulk session revocation error:', error.message);
    return {
      success: false,
      code: 'SYSTEM_ERROR',
      error: error.message
    };
  }
}

/**
 * Restore a Wi-Fi session for reconnection
 * Validates session, device, student, and membership before allowing restoration
 */
async function restoreWiFiSession(sessionId) {
  try {
    const session = await wifiSessionRepository.findBySessionId(sessionId);
    if (!session) {
      return {
        success: false,
        code: 'SESSION_NOT_FOUND',
        session: null
      };
    }

    // Check if session is already active
    if (session.status === 'active' && session.expiresAt > new Date()) {
      // Update last activity
      await wifiSessionRepository.updateLastActivity(sessionId);
      
      logger.info(`[wifiSessionService] Session ${sessionId} already active, updated last activity`);
      
      return {
        success: true,
        action: 'already_active',
        session
      };
    }

    // Validate session components
    const student = await studentRepository.findById(session.student);
    if (!student || student.status !== 'Active') {
      return {
        success: false,
        code: 'STUDENT_INACTIVE',
        session
      };
    }

    const device = await registeredDeviceRepository.findById(session.device);
    if (!device || device.status !== 'active') {
      return {
        success: false,
        code: 'DEVICE_INACTIVE',
        session
      };
    }

    const membership = await getActive(session.student);
    if (!membership) {
      return {
        success: false,
        code: 'MEMBERSHIP_EXPIRED',
        session
      };
    }

    // Check if session was revoked
    if (session.status === 'revoked') {
      // Do not auto-restore revoked sessions
      return {
        success: false,
        code: 'SESSION_REVOKED',
        session
      };
    }

    // If session expired, create a new one instead of restoring
    if (session.status === 'expired') {
      return {
        success: false,
        code: 'SESSION_EXPIRED',
        session
      };
    }

    // Restore session
    await wifiSessionRepository.restoreSession(sessionId);

    await AuditLog.create({
      action: 'wifi_session_restored',
      actorId: null,
      actorRole: 'system',
      actorName: 'Wi-Fi Session',
      targetType: 'WiFiSession',
      targetId: session._id.toString(),
      targetName: sessionId,
      details: {
        studentId: student.studentId,
        studentName: student.name,
        deviceId: device.deviceId
      }
    });

    logger.info(`[wifiSessionService] Session ${sessionId} restored for student ${student.studentId}`);

    return {
      success: true,
      action: 'restored',
      session
    };

  } catch (error) {
    logger.error('[wifiSessionService] Session restoration error:', error.message);
    return {
      success: false,
      code: 'SYSTEM_ERROR',
      error: error.message,
      session: null
    };
  }
}

/**
 * Expire all sessions that have passed their expiry time
 * Called by cron job
 */
async function expireOldSessions() {
  try {
    const now = new Date();
    
    // Find sessions to expire first
    const sessionsToExpire = await wifiSessionRepository.findSessionsToExpire(now);

    // Update status to expired
    const result = await wifiSessionRepository.expireOldSessions(now);

    if (result.modifiedCount > 0) {
      logger.info(`[wifiSessionService] Expired ${result.modifiedCount} sessions`);
      
      // Deauthorize gateway for each expired session
      for (const session of sessionsToExpire) {
        try {
          await gatewayService.deauthorizeClient({
            gatewayId: session.gatewayId,
            studentId: session.student?.studentId,
            deviceId: session.device?.deviceId,
            sessionId: session.sessionId,
            clientIp: session.network?.ipAddress,
            clientMac: session.device?.deviceInfo?.macAddress
          });
        } catch (error) {
          logger.error(`[wifiSessionService] Gateway deauthorization failed for session ${session.sessionId}:`, error.message);
        }
      }
      
      await AuditLog.create({
        action: 'wifi_session_expired',
        actorId: null,
        actorRole: 'system',
        actorName: 'Wi-Fi Session Cron',
        targetType: 'WiFiSession',
        targetId: 'bulk',
        targetName: 'Bulk Expiration',
        details: {
          sessionsExpired: result.modifiedCount,
          expiredAt: now.toISOString()
        }
      });
    }

    return {
      success: true,
      expiredCount: result.modifiedCount
    };

  } catch (error) {
    logger.error('[wifiSessionService] Session expiration error:', error.message);
    return {
      success: false,
      code: 'SYSTEM_ERROR',
      error: error.message
    };
  }
}

export {
  createWiFiSession,
  validateWiFiSession,
  revokeWiFiSession,
  revokeAllStudentSessions,
  restoreWiFiSession,
  expireOldSessions
};
