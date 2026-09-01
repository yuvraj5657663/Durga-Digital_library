import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import { getActive } from './membershipService.js';
import AuditLog from '../models/AuditLog.js';
import logger from '../config/logger.js';

/**
 * Check Wi-Fi attendance eligibility for a student
 * Uses existing membership service as the single source of truth
 */
async function checkWiFiEligibility(studentId) {
  try {
    const student = await Student.findById(studentId);
    if (!student) {
      return { eligible: false, reason: 'STUDENT_NOT_FOUND', student: null };
    }

    // Check student status
    if (student.status !== 'Active') {
      return { eligible: false, reason: 'STUDENT_INACTIVE', student };
    }

    // Use existing membership service
    const membership = await getActive(studentId);
    
    if (!membership) {
      return { eligible: false, reason: 'NO_ACTIVE_MEMBERSHIP', student, membership: null };
    }

    // Check membership status
    if (membership.status !== 'Active') {
      return { eligible: false, reason: 'MEMBERSHIP_INACTIVE', student, membership };
    }

    // Check expiry date using existing logic
    const today = new Date().toISOString().slice(0, 10);
    if (membership.expiryDate < today) {
      return { eligible: false, reason: 'MEMBERSHIP_EXPIRED', student, membership };
    }

    return { 
      eligible: true, 
      student, 
      membership,
      expiryDate: membership.expiryDate 
    };
  } catch (error) {
    logger.error('[wifiAttendanceService] Eligibility check error:', error.message);
    return { eligible: false, reason: 'SYSTEM_ERROR', error: error.message };
  }
}

/**
 * Create Wi-Fi attendance record (idempotent)
 * Only creates attendance if one doesn't already exist for today
 */
async function createWiFiAttendance(studentId, sessionInfo = {}) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const nowTimestamp = new Date();
    
    // Use existing timezone handling (Asia/Kolkata)
    const nowTime = nowTimestamp.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Kolkata' 
    });

    // Check eligibility first
    const eligibility = await checkWiFiEligibility(studentId);
    if (!eligibility.eligible) {
      logger.info(`[wifiAttendanceService] Attendance denied for student ${studentId}: ${eligibility.reason}`);
      return {
        success: false,
        action: 'denied',
        reason: eligibility.reason,
        attendance: null
      };
    }

    const { student, membership } = eligibility;

    // Check if attendance already exists for today (idempotent)
    const existing = await Attendance.findOne({ 
      student: studentId, 
      date: today 
    });

    if (existing && existing.checkIn) {
      logger.info(`[wifiAttendanceService] Existing attendance found for student ${studentId} on ${today}`);
      return { 
        success: true,
        action: 'existing_record',
        attendance: existing,
        message: 'Attendance already recorded for today'
      };
    }

    // Create new attendance record
    const studentShift = student.shift || 'Shift 1';
    
    const attendance = await Attendance.findOneAndUpdate(
      { student: studentId, date: today },
      {
        $setOnInsert: { student: studentId, date: today },
        $set: {
          checkIn: nowTime,
          checkInTimestamp: nowTimestamp,
          checkOut: '',
          checkOutTimestamp: null,
          durationMins: 0,
          method: 'wifi_network',
          shift: studentShift,
          shiftType: studentShift,
          status: 'CHECKED_IN',
          seatCode: student.seatCode || '',
          markedBy: null, // System-generated
          branch: student.branch || '',
          membership: membership?._id || null,
          isValidated: true,
          validationMessage: '',
          // Wi-Fi specific fields
          sessionReference: sessionInfo.sessionId || '',
          deviceReference: sessionInfo.deviceId || '',
          networkVerified: sessionInfo.networkVerified !== false, // Default true unless explicitly false
          ipAddress: sessionInfo.ipAddress || '',
          gatewayIdentifier: sessionInfo.gatewayId || '',
          connectionType: 'wifi',
          authenticationMethod: 'credentials'
        }
      },
      { upsert: true, new: true }
    );

    // Log Wi-Fi attendance creation
    await AuditLog.create({
      action: 'wifi_attendance_created',
      actorId: null, // System-generated
      actorRole: 'system',
      actorName: 'Wi-Fi Network',
      targetType: 'Attendance',
      targetId: attendance._id.toString(),
      targetName: `${student.name} - ${today}`,
      details: {
        method: 'wifi_network',
        checkIn: nowTime,
        sessionReference: sessionInfo.sessionId,
        deviceReference: sessionInfo.deviceId,
        gatewayIdentifier: sessionInfo.gatewayId
      }
    });

    logger.info(`[wifiAttendanceService] Wi-Fi attendance created for student ${studentId} at ${nowTime}`);

    return { 
      success: true,
      action: 'created',
      attendance,
      message: 'Attendance created via Wi-Fi authentication'
    };

  } catch (error) {
    logger.error('[wifiAttendanceService] Attendance creation error:', error.message);
    return {
      success: false,
      action: 'error',
      reason: 'SYSTEM_ERROR',
      error: error.message,
      attendance: null
    };
  }
}

export {
  checkWiFiEligibility,
  createWiFiAttendance
};