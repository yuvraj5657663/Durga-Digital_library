import { v4 as uuidv4 } from 'uuid';
import { checkWiFiEligibility } from './wifiAttendanceService.js';
import { registerOrUpdateDevice } from './deviceService.js';
import { createWiFiSession, revokeWiFiSession } from './wifiSessionService.js';
import gatewayService from './gatewayService.js';
import AuditLog from '../models/AuditLog.js';
import logger from '../config/logger.js';
import config from '../config/index.js';
import { toActorId } from '../utils/actorId.js';
import {
  captivePortalSessionRepository,
  studentRepository,
  userRepository,
  wifiSessionRepository
} from '../repositories/index.js';

/**
 * Generate a unique portal session ID
 */
function generatePortalSessionId() {
  return `CPS-${uuidv4().replace(/-/g, '').toUpperCase()}`;
}

/**
 * Validate URL for open redirect protection
 * Only allow HTTP/HTTPS URLs or approved internal destinations
 */
function isValidRedirectUrl(url) {
  if (!url) return true; // Empty URL is safe
  
  try {
    const parsedUrl = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }
    
    // In production, you might want to whitelist specific domains
    // For now, we'll block obvious malicious patterns
    const suspiciousPatterns = [
      /attacker/i,
      /malicious/i,
      /phishing/i
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(parsedUrl.hostname)) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    // Invalid URL format
    return false;
  }
}

/**
 * Initiate a captive portal session
 * Creates a temporary session that identifies the client without authorizing access
 */
async function initiatePortalSession({ gatewayId, clientIp, clientMac, originalUrl, userAgent, connectionType = 'wifi' }) {
  try {
    // Validate gateway
    const gatewayValidation = await gatewayService.validateGateway(gatewayId);
    if (!gatewayValidation.valid) {
      logger.warn(`[captivePortalService] Gateway validation failed: ${gatewayId}`);
      
      return {
        success: false,
        code: 'GATEWAY_NOT_AUTHORIZED',
        portalSession: null
      };
    }

    // Validate original URL for open redirect protection
    if (originalUrl && !isValidRedirectUrl(originalUrl)) {
      logger.warn(`[captivePortalService] Invalid redirect URL blocked: ${originalUrl}`);
      
      return {
        success: false,
        code: 'INVALID_REDIRECT_URL',
        portalSession: null
      };
    }

    // Create portal session
    const portalSessionId = generatePortalSessionId();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + config.network.portalSessionDurationMinutes * 60 * 1000);

    const portalSession = await captivePortalSessionRepository.createPortalSession({
      portalSessionId,
      gatewayId,
      client: {
        ipAddress: clientIp || '',
        macAddress: clientMac || '',
        userAgent: userAgent || ''
      },
      originalUrl: originalUrl || '',
      status: 'pending',
      createdAt,
      expiresAt
    });

    // Log portal session creation
    await AuditLog.create({
      action: 'portal_session_created',
      actorId: null,
      actorRole: 'system',
      actorName: 'Captive Portal',
      targetType: 'CaptivePortalSession',
      targetId: portalSession._id.toString(),
      targetName: portalSessionId,
      details: {
        gatewayId,
        clientIp,
        expiresAt: expiresAt.toISOString()
      }
    });

    logger.info(`[captivePortalService] Portal session created: ${portalSessionId}`);

    return {
      success: true,
      portalSession
    };

  } catch (error) {
    logger.error('[captivePortalService] Portal session creation error:', error.message);
    return {
      success: false,
      code: 'SYSTEM_ERROR',
      error: error.message,
      portalSession: null
    };
  }
}

/**
 * Authenticate through captive portal
 * Validates credentials, creates Wi-Fi session, authorizes gateway access
 */
async function authenticatePortalSession({ portalSessionId, studentId, mobile, deviceInfo, clientIp }) {
  try {
    // Find portal session
    const portalSession = await captivePortalSessionRepository.findByPortalSessionId(portalSessionId);
    if (!portalSession) {
      logger.warn(`[captivePortalService] Portal session not found: ${portalSessionId}`);
      
      return {
        success: false,
        code: 'PORTAL_SESSION_NOT_FOUND',
        authorized: false
      };
    }

    // Check if portal session expired
    if (portalSession.expiresAt < new Date()) {
      await captivePortalSessionRepository.markExpired(portalSessionId);
      
      await AuditLog.create({
        action: 'portal_authentication_failed',
        actorId: null,
        actorRole: 'system',
        actorName: 'Captive Portal',
        targetType: 'CaptivePortalSession',
        targetId: portalSession._id.toString(),
        targetName: portalSessionId,
        details: {
          reason: 'PORTAL_SESSION_EXPIRED'
        }
      });
      
      return {
        success: false,
        code: 'PORTAL_SESSION_EXPIRED',
        authorized: false
      };
    }

    // Validate gateway again
    const gatewayValidation = await gatewayService.validateGateway(portalSession.gatewayId);
    if (!gatewayValidation.valid) {
      await captivePortalSessionRepository.markFailed(portalSessionId, 'GATEWAY_NOT_AUTHORIZED');
      
      return {
        success: false,
        code: 'GATEWAY_NOT_AUTHORIZED',
        authorized: false
      };
    }

    // Normalize mobile number
    const normalizedMobile = mobile.replace(/\D/g, '');
    const mobileWithCountry = normalizedMobile.length === 10 ? `91${normalizedMobile}` : normalizedMobile;

    // Find user by mobile
    const user = await userRepository.findByLoginId(mobileWithCountry);

    if (!user) {
      await captivePortalSessionRepository.markFailed(portalSessionId, 'INVALID_STUDENT_CREDENTIALS');
      
      await AuditLog.create({
        action: 'portal_authentication_failed',
        actorId: null,
        actorRole: 'system',
        actorName: 'Captive Portal',
        targetType: 'CaptivePortalSession',
        targetId: portalSession._id.toString(),
        targetName: portalSessionId,
        details: {
          reason: 'INVALID_STUDENT_CREDENTIALS',
          mobile: mobileWithCountry
        }
      });
      
      return {
        success: false,
        code: 'INVALID_STUDENT_CREDENTIALS',
        authorized: false
      };
    }

    // Verify student ID
    const student = await studentRepository.findById(user.studentRef);
    if (!student || student.studentId !== studentId) {
      await captivePortalSessionRepository.markFailed(portalSessionId, 'INVALID_STUDENT_CREDENTIALS');
      
      return {
        success: false,
        code: 'INVALID_STUDENT_CREDENTIALS',
        authorized: false
      };
    }

    // Check Wi-Fi eligibility
    const eligibility = await checkWiFiEligibility(student._id);
    if (!eligibility.eligible) {
      await captivePortalSessionRepository.markFailed(portalSessionId, eligibility.reason);
      
      await AuditLog.create({
        action: 'portal_authentication_failed',
        actorId: null,
        actorRole: 'system',
        actorName: 'Captive Portal',
        targetType: 'CaptivePortalSession',
        targetId: portalSession._id.toString(),
        targetName: portalSessionId,
        details: {
          reason: eligibility.reason,
          studentId: student.studentId
        }
      });
      
      return {
        success: false,
        code: eligibility.reason,
        authorized: false
      };
    }

    // Register or update device
    const deviceResult = await registerOrUpdateDevice(
      student._id,
      deviceInfo || {
        name: 'Unknown Device',
        type: 'other',
        platform: ''
      },
      {
        macAddress: portalSession.client.macAddress || '',
        userAgent: portalSession.client.userAgent || ''
      },
      null
    );

    if (!deviceResult.success) {
      await captivePortalSessionRepository.markFailed(portalSessionId, deviceResult.code);
      
      return {
        success: false,
        code: deviceResult.code,
        authorized: false
      };
    }

    // Create Wi-Fi session
    const sessionResult = await createWiFiSession({
      studentId: student._id,
      deviceId: deviceResult.device.deviceId,
      gatewayId: portalSession.gatewayId,
      ipAddress: portalSession.client.ipAddress || clientIp || '',
      connectionType: 'wifi'
    });

    if (!sessionResult.success) {
      await captivePortalSessionRepository.markFailed(portalSessionId, sessionResult.code);
      
      return {
        success: false,
        code: sessionResult.code,
        authorized: false
      };
    }

    // Authorize gateway client
    const gatewayAuthResult = await gatewayService.authorizeClient({
      gatewayId: portalSession.gatewayId,
      studentId: student.studentId,
      deviceId: deviceResult.device.deviceId,
      sessionId: sessionResult.session.sessionId,
      clientIp: portalSession.client.ipAddress || clientIp || '',
      clientMac: portalSession.client.macAddress || '',
      expiresAt: sessionResult.session.expiresAt
    });

    if (!gatewayAuthResult.success || !gatewayAuthResult.authorized) {
      // Gateway authorization failed - revoke the Wi-Fi session to avoid leaving an apparently active session
      await revokeWiFiSession(sessionResult.session.sessionId, 'GATEWAY_AUTHORIZATION_FAILED');
      
      await captivePortalSessionRepository.markFailed(portalSessionId, gatewayAuthResult.code || 'GATEWAY_AUTHORIZATION_FAILED');
      
      await AuditLog.create({
        action: 'portal_authorization_failed',
        actorId: null,
        actorRole: 'system',
        actorName: 'Captive Portal',
        targetType: 'CaptivePortalSession',
        targetId: portalSession._id.toString(),
        targetName: portalSessionId,
        details: {
          reason: gatewayAuthResult.code || 'GATEWAY_AUTHORIZATION_FAILED',
          studentId: student.studentId,
          gatewayCode: gatewayAuthResult.code
        }
      });
      
      return {
        success: false,
        code: gatewayAuthResult.code || 'GATEWAY_AUTHORIZATION_FAILED',
        authorized: false
      };
    }

    // Mark portal session as authorized
    await captivePortalSessionRepository.markAuthorized(
      portalSessionId,
      student._id,
      deviceResult.device._id,
      sessionResult.session._id
    );

    // Log success
    await AuditLog.create({
      action: 'portal_authorization_success',
      actorId: null,
      actorRole: 'system',
      actorName: 'Captive Portal',
      targetType: 'CaptivePortalSession',
      targetId: portalSession._id.toString(),
      targetName: portalSessionId,
      details: {
        studentId: student.studentId,
        studentName: student.name,
        deviceId: deviceResult.device.deviceId,
        wifiSessionId: sessionResult.session.sessionId
      }
    });

    logger.info(`[captivePortalService] Portal authentication successful: ${portalSessionId}`);

    return {
      success: true,
      authorized: true,
      portalSession,
      wifiSession: sessionResult.session,
      wifiToken: sessionResult.token,
      student,
      device: deviceResult.device
    };

  } catch (error) {
    logger.error('[captivePortalService] Portal authentication error:', error.message);
    return {
      success: false,
      code: 'SYSTEM_ERROR',
      error: error.message,
      authorized: false
    };
  }
}

/**
 * Logout from captive portal
 * Revokes Wi-Fi session and deauthorizes gateway client
 */
async function logoutPortalSession(portalSessionId) {
  try {
    const portalSession = await captivePortalSessionRepository.findByPortalSessionId(portalSessionId);
    if (!portalSession) {
      return {
        success: false,
        code: 'PORTAL_SESSION_NOT_FOUND'
      };
    }

    // Revoke Wi-Fi session if exists (this includes gateway deauthorization)
    if (portalSession.wifiSession) {
      const wifiSession = await wifiSessionRepository.findBySessionId(portalSession.wifiSession.sessionId);
      if (wifiSession && wifiSession.sessionId) {
        await revokeWiFiSession(wifiSession.sessionId, 'portal_logout');
      }
    }

    // Mark portal session as expired
    await captivePortalSessionRepository.markExpired(portalSessionId);

    // Log logout
    await AuditLog.create({
      action: 'portal_logout',
      actorId: null,
      actorRole: 'system',
      actorName: 'Captive Portal',
      targetType: 'CaptivePortalSession',
      targetId: portalSession._id.toString(),
      targetName: portalSessionId,
      details: {
        gatewayId: portalSession.gatewayId
      }
    });

    logger.info(`[captivePortalService] Portal logout: ${portalSessionId}`);

    return {
      success: true
    };

  } catch (error) {
    logger.error('[captivePortalService] Portal logout error:', error.message);
    return {
      success: false,
      code: 'SYSTEM_ERROR',
      error: error.message
    };
  }
}

/**
 * Get portal session status
 */
async function getPortalSessionStatus(portalSessionId) {
  try {
    const portalSession = await captivePortalSessionRepository.findWithPopulations(portalSessionId);

    if (!portalSession) {
      return {
        success: false,
        code: 'PORTAL_SESSION_NOT_FOUND'
      };
    }

    // Check if expired
    if (portalSession.expiresAt < new Date() && portalSession.status === 'pending') {
      await captivePortalSessionRepository.markExpired(portalSessionId);
    }

    return {
      success: true,
      portalSession
    };

  } catch (error) {
    logger.error('[captivePortalService] Get status error:', error.message);
    return {
      success: false,
      code: 'SYSTEM_ERROR',
      error: error.message
    };
  }
}

/**
 * Expire a portal session (admin only)
 */
async function expirePortalSession(portalSessionId) {
  try {
    const portalSession = await captivePortalSessionRepository.findByPortalSessionId(portalSessionId);
    if (!portalSession) {
      return {
        success: false,
        code: 'PORTAL_SESSION_NOT_FOUND'
      };
    }

    await captivePortalSessionRepository.markExpired(portalSessionId);

    return {
      success: true,
      portalSession
    };

  } catch (error) {
    logger.error('[captivePortalService] Expire session error:', error.message);
    return {
      success: false,
      code: 'SYSTEM_ERROR',
      error: error.message
    };
  }
}

export {
  initiatePortalSession,
  authenticatePortalSession,
  logoutPortalSession,
  getPortalSessionStatus,
  expirePortalSession
};
