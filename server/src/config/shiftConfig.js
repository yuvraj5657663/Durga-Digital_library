/**
 * Shift Time Configuration
 * Defines time ranges for each shift type for attendance validation
 */

const SHIFT_CONFIG = {
  'Shift 1': {
    name: 'Shift 1',
    startTime: '06:00', // 6 AM
    endTime: '11:00',   // 11 AM
    hours: 5,
    description: 'Morning (6 AM – 11 AM)',
    allowedCheckInStart: '05:30', // Allow check-in 30 min before shift
    allowedCheckInEnd: '12:00',   // Allow check-in until 1 hour after shift
    allowedCheckOutStart: '06:00', // Can check out when shift starts
    allowedCheckOutEnd: '12:30'    // Can check out until 1.5 hours after shift
  },
  'Shift 2': {
    name: 'Shift 2',
    startTime: '11:00', // 11 AM
    endTime: '16:00',   // 4 PM
    hours: 5,
    description: 'Afternoon (11 AM – 4 PM)',
    allowedCheckInStart: '10:30',
    allowedCheckInEnd: '17:00',
    allowedCheckOutStart: '11:00',
    allowedCheckOutEnd: '17:30'
  },
  'Shift 3': {
    name: 'Shift 3',
    startTime: '16:00', // 4 PM
    endTime: '21:00',   // 9 PM
    hours: 5,
    description: 'Evening (4 PM – 9 PM)',
    allowedCheckInStart: '15:30',
    allowedCheckInEnd: '22:00',
    allowedCheckOutStart: '16:00',
    allowedCheckOutEnd: '22:30'
  },
  'Shift 4': {
    name: 'Shift 4',
    startTime: '06:00', // 6 AM
    endTime: '21:00',   // 9 PM
    hours: 15,
    description: 'Full Day (6 AM – 9 PM)',
    allowedCheckInStart: '05:30',
    allowedCheckInEnd: '22:00',
    allowedCheckOutStart: '06:00',
    allowedCheckOutEnd: '22:30'
  },
  'Night Shift': {
    name: 'Night Shift',
    startTime: '21:00', // 9 PM
    endTime: '06:00',   // 6 AM next day
    hours: 9,
    description: 'Night (9 PM – 6 AM)',
    allowedCheckInStart: '20:30',
    allowedCheckInEnd: '07:00',
    allowedCheckOutStart: '21:00',
    allowedCheckOutEnd: '07:30'
  },
  'Custom': {
    name: 'Custom Shift',
    startTime: null,    // User-defined
    endTime: null,      // User-defined
    hours: null,        // User-defined
    description: 'Custom Shift',
    allowedCheckInStart: null,
    allowedCheckInEnd: null,
    allowedCheckOutStart: null,
    allowedCheckOutEnd: null,
    isFlexible: true     // Custom shifts have flexible timing
  }
};

/**
 * Convert time string to minutes for comparison
 * @param {string} timeStr - Time in HH:MM format
 * @returns {number} Minutes from midnight
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Get current time in HH:MM format
 * @returns {string} Current time
 */
function getCurrentTime() {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
}

/**
 * Validate if current time is within allowed check-in window for a shift
 * @param {string} shiftType - Shift type (e.g., 'Shift 1', 'Night Shift')
 * @param {string} customTiming - Custom timing for 'Custom' shift
 * @returns {object} Validation result
 */
function validateCheckIn(shiftType, customTiming = null) {
  const shiftConfig = SHIFT_CONFIG[shiftType];
  
  if (!shiftConfig) {
    return {
      isValid: false,
      message: `Invalid shift type: ${shiftType}`
    };
  }

  // Custom shifts have flexible timing - always allow check-in
  if (shiftConfig.isFlexible) {
    return {
      isValid: true,
      message: 'Custom shift - flexible timing'
    };
  }

  const currentTime = getCurrentTime();
  const currentMinutes = timeToMinutes(currentTime);
  const checkInStart = timeToMinutes(shiftConfig.allowedCheckInStart);
  const checkInEnd = timeToMinutes(shiftConfig.allowedCheckInEnd);

  if (currentMinutes >= checkInStart && currentMinutes <= checkInEnd) {
    return {
      isValid: true,
      message: `Check-in allowed for ${shiftConfig.description}`,
      shiftInfo: shiftConfig
    };
  }

  return {
    isValid: false,
    message: `Check-in not allowed for ${shiftConfig.description}. Current time: ${currentTime}. Allowed: ${shiftConfig.allowedCheckInStart} - ${shiftConfig.allowedCheckInEnd}`,
    shiftInfo: shiftConfig
  };
}

/**
 * Validate if current time is within allowed check-out window for a shift
 * @param {string} shiftType - Shift type
 * @param {string} customTiming - Custom timing for 'Custom' shift
 * @returns {object} Validation result
 */
function validateCheckOut(shiftType, customTiming = null) {
  const shiftConfig = SHIFT_CONFIG[shiftType];
  
  if (!shiftConfig) {
    return {
      isValid: false,
      message: `Invalid shift type: ${shiftType}`
    };
  }

  // Custom shifts have flexible timing - always allow check-out
  if (shiftConfig.isFlexible) {
    return {
      isValid: true,
      message: 'Custom shift - flexible timing'
    };
  }

  const currentTime = getCurrentTime();
  const currentMinutes = timeToMinutes(currentTime);
  const checkOutStart = timeToMinutes(shiftConfig.allowedCheckOutStart);
  const checkOutEnd = timeToMinutes(shiftConfig.allowedCheckOutEnd);

  if (currentMinutes >= checkOutStart && currentMinutes <= checkOutEnd) {
    return {
      isValid: true,
      message: `Check-out allowed for ${shiftConfig.description}`,
      shiftInfo: shiftConfig
    };
  }

  return {
    isValid: false,
    message: `Check-out not allowed for ${shiftConfig.description}. Current time: ${currentTime}. Allowed: ${shiftConfig.allowedCheckOutStart} - ${shiftConfig.allowedCheckOutEnd}`,
    shiftInfo: shiftConfig
  };
}

/**
 * Check if shift has ended (for shift end notifications)
 * @param {string} shiftType - Shift type
 * @returns {boolean} True if shift has ended
 */
function hasShiftEnded(shiftType) {
  const shiftConfig = SHIFT_CONFIG[shiftType];
  
  if (!shiftConfig || shiftConfig.isFlexible) {
    return false;
  }

  const currentTime = getCurrentTime();
  const currentMinutes = timeToMinutes(currentTime);
  const endTime = timeToMinutes(shiftConfig.endTime);

  // For night shift (21:00 - 06:00), handle overnight wraparound
  if (shiftType === 'Night Shift') {
    // Shift ends at 06:00 next day
    // Consider shift ended if current time is after 06:00 AM
    return currentMinutes >= 360; // After 6 AM
  }

  return currentMinutes > endTime;
}

/**
 * Get shift end time for notifications
 * @param {string} shiftType - Shift type
 * @returns {string} Shift end time
 */
function getShiftEndTime(shiftType) {
  const shiftConfig = SHIFT_CONFIG[shiftType];
  return shiftConfig ? shiftConfig.endTime : null;
}

module.exports = {
  SHIFT_CONFIG,
  validateCheckIn,
  validateCheckOut,
  hasShiftEnded,
  getShiftEndTime,
  timeToMinutes,
  getCurrentTime
};