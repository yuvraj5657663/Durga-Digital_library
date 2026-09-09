import { successResponse, errorResponse } from '../utils/response.js';
import { asyncHandler, NotFoundError, ValidationError } from '../utils/errors.js';
import {
  validateWiFiSession,
  revokeWiFiSession,
  revokeAllStudentSessions,
  restoreWiFiSession
} from '../services/wifiSessionService.js';
import WiFiSession from '../models/WiFiSession.js';
import Student from '../models/Student.js';
import logger from '../config/logger.js';

/**
 * Validate a Wi-Fi session token
 * Called by gateway or network components to verify session validity
 */
export const validateSessionController = asyncHandler(async (req, res) => {
  const { token, sessionId } = req.body;

  if (!token || !sessionId) {
    throw new ValidationError('token and sessionId are required');
  }

  const result = await validateWiFiSession(token, sessionId);

  if (!result.success) {
    return errorResponse(res, {
      success: false,
      authorized: false,
      code: result.code,
      message: result.code
    }, 401);
  }

  return successResponse(res, {
    success: true,
    authorized: true,
    session: {
      sessionId: result.session.sessionId,
      expiresAt: result.session.expiresAt,
      lastActivityAt: result.session.lastActivityAt
    }
  }, 'Session validated successfully');
});

/**
 * Revoke a specific Wi-Fi session
 * Can be called by student (own session) or admin (any session)
 */
export const revokeSessionController = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { reason } = req.body;

  const result = await revokeWiFiSession(sessionId, reason || 'manual_logout');

  if (!result.success) {
    const statusCode = result.code === 'SESSION_NOT_FOUND' ? 404 : 400;
    return errorResponse(res, {
      success: false,
      code: result.code,
      message: result.code
    }, statusCode);
  }

  return successResponse(res, result.session, 'Session revoked successfully');
});

/**
 * Restore a Wi-Fi session for reconnection
 */
export const restoreSessionController = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const result = await restoreWiFiSession(sessionId);

  if (!result.success) {
    const statusCode = result.code === 'SESSION_NOT_FOUND' ? 404 : 403;
    return errorResponse(res, {
      success: false,
      code: result.code,
      message: result.code
    }, statusCode);
  }

  return successResponse(res, result.session, 'Session restored successfully');
});

/**
 * Get session details (admin only)
 */
export const getSessionController = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await WiFiSession.findOne({ sessionId })
    .populate('student', 'name studentId mobile email')
    .populate('device', 'deviceId deviceInfo')
    .populate('attendance.attendanceId', 'date checkIn checkOut');

  if (!session) {
    throw new NotFoundError('Session not found');
  }

  return successResponse(res, session, 'Session retrieved successfully');
});

/**
 * Get all sessions with pagination (admin only)
 */
export const getAllSessionsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status, studentId, search, view = 'all' } = req.query;
  
  const filter = {};
  if (status && status !== 'disconnected') filter.status = status;
  if (studentId) {
    const student = await Student.findOne({ studentId });
    if (student) filter.student = student._id;
  }
  if (search) {
    const matchingStudents = await Student.find({
      $or: [
        { name: new RegExp(search, 'i') },
        { studentId: new RegExp(search, 'i') },
        { mobile: new RegExp(search, 'i') }
      ]
    }).select('_id');
    filter.$or = [
      { student: { $in: matchingStudents.map(student => student._id) } },
      { sessionId: new RegExp(search, 'i') },
      { gatewayId: new RegExp(search, 'i') }
    ];
  }
  if (view === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    filter.startedAt = { $gte: start };
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [sessions, total] = await Promise.all([
    WiFiSession.find(filter)
      .populate('student', 'name studentId mobile email status expiryDate branch seatCode membershipRef')
      .populate('device', 'deviceId deviceInfo deviceFingerprint status')
      .populate('attendance.attendanceId', 'date checkIn checkOut durationMins status')
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10)),
    WiFiSession.countDocuments(filter)
  ]);

  const now = Date.now();
  const enrichedSessions = sessions.map(session => {
    const isDisconnected = session.status === 'active' &&
      now - new Date(session.lastActivityAt).getTime() > 5 * 60 * 1000;
    const liveStatus = session.status === 'active'
      ? (new Date(session.expiresAt).getTime() <= now ? 'EXPIRED' : isDisconnected ? 'DISCONNECTED' : 'ACTIVE')
      : session.status.toUpperCase();
    const deviceInfo = session.device?.deviceInfo || {};
    return {
      ...session.toObject(),
      authorized: Boolean(session.student && session.device),
      liveStatus,
      student: session.student ? {
        ...session.student.toObject(),
        membershipStatus: session.student.status === 'Active' && session.student.expiryDate >= new Date().toISOString().slice(0, 10)
          ? 'ACTIVE' : 'EXPIRED'
      } : null,
      device: session.device ? {
        ...session.device.toObject(),
        name: deviceInfo.name || 'Unknown device',
        type: deviceInfo.type || 'other',
        browserOs: deviceInfo.platform || session.device.deviceFingerprint?.userAgent || ''
      } : null,
      connection: {
        ipAddress: session.network?.ipAddress || '',
        gatewayId: session.gatewayId,
        connectionTime: session.startedAt,
        lastSeen: session.lastActivityAt,
        expiresAt: session.expiresAt
      },
      attendance: session.attendance?.attendanceId || null
    };
  });

  const visibleSessions = status && status.toUpperCase() === 'DISCONNECTED'
    ? enrichedSessions.filter(session => session.liveStatus === 'DISCONNECTED')
    : enrichedSessions;

  return successResponse(res, {
    sessions: visibleSessions,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total
    }
  }, 'Sessions retrieved successfully');
});

/**
 * Revoke all sessions for a student (admin only)
 */
export const revokeStudentSessionsController = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { reason } = req.body;

  const student = await Student.findById(studentId);
  if (!student) {
    throw new NotFoundError('Student not found');
  }

  const result = await revokeAllStudentSessions(studentId, reason || 'admin_action');

  if (!result.success) {
    return errorResponse(res, {
      success: false,
      code: result.code,
      message: result.code
    }, 500);
  }

  return successResponse(res, {
    revokedCount: result.revokedCount,
    studentId: student.studentId,
    studentName: student.name
  }, `Revoked ${result.revokedCount} sessions for student`);
});
