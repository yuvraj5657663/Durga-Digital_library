import RegisteredNetworkDevice from '../models/RegisteredNetworkDevice.js';
import NetworkDevice from '../models/NetworkDevice.js';
import Student from '../models/Student.js';
import AuditLog from '../models/AuditLog.js';
import logger from '../config/logger.js';
import config from '../config/index.js';
import { toActorId } from '../utils/actorId.js';

/**
 * Link a network device to a student
 */
async function linkDeviceToStudent(networkDeviceId, studentId, options = {}) {
  try {
    const { deviceLabel = '', notes = '', registeredBy = null } = options;

    // Verify network device exists
    const networkDevice = await NetworkDevice.findById(networkDeviceId);
    if (!networkDevice) {
      return {
        success: false,
        code: 'NETWORK_DEVICE_NOT_FOUND',
        message: 'Network device not found'
      };
    }

    // Verify student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return {
        success: false,
        code: 'STUDENT_NOT_FOUND',
        message: 'Student not found'
      };
    }

    // Check if device is already linked to this student
    const existingLink = await RegisteredNetworkDevice.findOne({
      networkDeviceId,
      studentId
    });

    if (existingLink) {
      // Update existing link
      existingLink.deviceLabel = deviceLabel || existingLink.deviceLabel;
      existingLink.notes = notes || existingLink.notes;
      existingLink.lastSeenAt = new Date();
      existingLink.status = 'active';
      existingLink.enabled = true;
      await existingLink.save();

      logger.info(`[registeredNetworkDeviceService] Updated link: device ${networkDeviceId} -> student ${studentId}`);

      return {
        success: true,
        action: 'updated',
        registeredDevice: existingLink
      };
    }

    // Check device limit for student
    const maxDevices = config.wifi.maxRegisteredNetworkDevicesPerStudent;
    const activeDeviceCount = await RegisteredNetworkDevice.countDocuments({
      studentId,
      status: 'active',
      enabled: true
    });

    if (activeDeviceCount >= maxDevices) {
      logger.warn(`[registeredNetworkDeviceService] Device limit reached for student ${studentId}: ${activeDeviceCount}/${maxDevices}`);

      return {
        success: false,
        code: 'DEVICE_LIMIT_REACHED',
        message: `Maximum registered devices reached (${maxDevices})`,
        currentCount: activeDeviceCount,
        maxDevices
      };
    }

    // Check if network device is already linked to another student
    const otherStudentLink = await RegisteredNetworkDevice.findOne({
      networkDeviceId,
      studentId: { $ne: studentId },
      status: 'active'
    });

    if (otherStudentLink) {
      logger.warn(`[registeredNetworkDeviceService] Device ${networkDeviceId} already linked to student ${otherStudentLink.studentId}`);

      return {
        success: false,
        code: 'DEVICE_ALREADY_LINKED',
        message: 'Device is already linked to another student',
        existingStudentId: otherStudentLink.studentId
      };
    }

    // Create new link
    const registeredDevice = await RegisteredNetworkDevice.create({
      networkDeviceId,
      studentId,
      agentId: networkDevice.agentId,
      deviceLabel: deviceLabel || '',
      ipAddress: networkDevice.ipAddress,
      macAddress: networkDevice.macAddress,
      manufacturer: networkDevice.manufacturer,
      registrationSource: 'manual_admin',
      registeredAt: new Date(),
      lastSeenAt: new Date(),
      status: 'active',
      enabled: true,
      notes: notes || '',
      registeredBy: toActorId(registeredBy)
    });

    // Log the registration
    await AuditLog.create({
      action: 'network_device_linked',
      actorId: toActorId(registeredBy),
      actorRole: registeredBy?.role || 'admin',
      actorName: registeredBy?.name || 'Admin',
      targetType: 'RegisteredNetworkDevice',
      targetId: registeredDevice._id.toString(),
      targetName: networkDevice.ipAddress,
      details: {
        studentId: student.studentId,
        studentName: student.name,
        networkDeviceId: networkDevice.ipAddress,
        macAddress: networkDevice.macAddress,
        manufacturer: networkDevice.manufacturer
      }
    });

    logger.info(`[registeredNetworkDeviceService] Linked device ${networkDeviceId} to student ${studentId}`);

    return {
      success: true,
      action: 'created',
      registeredDevice
    };

  } catch (error) {
    logger.error('[registeredNetworkDeviceService] Link device error:', error.message);
    return {
      success: false,
      code: 'SYSTEM_ERROR',
      error: error.message
    };
  }
}

/**
 * Unlink a network device from a student
 */
async function unlinkDeviceFromStudent(networkDeviceId, unlinkedBy = null) {
  try {
    const registeredDevice = await RegisteredNetworkDevice.findOne({ networkDeviceId });

    if (!registeredDevice) {
      return {
        success: false,
        code: 'REGISTRATION_NOT_FOUND',
        message: 'Device registration not found'
      };
    }

    // Get student info for audit log
    const student = await Student.findById(registeredDevice.studentId);

    // Disable the registration (don't delete for audit trail)
    registeredDevice.status = 'revoked';
    registeredDevice.enabled = false;
    await registeredDevice.save();

    // Log the unlink
    await AuditLog.create({
      action: 'network_device_unlinked',
      actorId: toActorId(unlinkedBy),
      actorRole: unlinkedBy?.role || 'admin',
      actorName: unlinkedBy?.name || 'Admin',
      targetType: 'RegisteredNetworkDevice',
      targetId: registeredDevice._id.toString(),
      targetName: registeredDevice.ipAddress,
      details: {
        studentId: student?.studentId,
        studentName: student?.name,
        networkDeviceId: registeredDevice.ipAddress
      }
    });

    logger.info(`[registeredNetworkDeviceService] Unlinked device ${networkDeviceId} from student ${registeredDevice.studentId}`);

    return {
      success: true,
      registeredDevice
    };

  } catch (error) {
    logger.error('[registeredNetworkDeviceService] Unlink device error:', error.message);
    return {
      success: false,
      code: 'SYSTEM_ERROR',
      error: error.message
    };
  }
}

/**
 * Get all registered devices for a student
 */
async function getStudentRegisteredDevices(studentId) {
  try {
    const registeredDevices = await RegisteredNetworkDevice.find({ studentId })
      .populate('networkDeviceId')
      .populate('registeredBy', 'name username')
      .sort({ registeredAt: -1 });

    return {
      success: true,
      registeredDevices
    };
  } catch (error) {
    logger.error('[registeredNetworkDeviceService] Get student devices error:', error.message);
    return {
      success: false,
      error: error.message,
      registeredDevices: []
    };
  }
}

/**
 * Get student information for a network device
 */
async function getDeviceStudentInfo(networkDeviceId) {
  try {
    const registeredDevice = await RegisteredNetworkDevice.findOne({ networkDeviceId })
      .populate('studentId', 'name studentId mobile email')
      .populate('registeredBy', 'name username');

    if (!registeredDevice) {
      return {
        success: true,
        linked: false,
        student: null
      };
    }

    return {
      success: true,
      linked: true,
      student: registeredDevice.studentId,
      registeredDevice
    };
  } catch (error) {
    logger.error('[registeredNetworkDeviceService] Get device student info error:', error.message);
    return {
      success: false,
      error: error.message,
      linked: false,
      student: null
    };
  }
}

/**
 * Get all registered devices with student information (admin)
 */
async function getAllRegisteredDevices(options = {}) {
  try {
    const { page = 1, limit = 50, status, studentId } = options;

    const filter = {};
    if (status) filter.status = status;
    if (studentId) filter.studentId = studentId;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [registeredDevices, total] = await Promise.all([
      RegisteredNetworkDevice.find(filter)
        .populate('networkDeviceId')
        .populate('studentId', 'name studentId mobile email')
        .populate('registeredBy', 'name username')
        .sort({ registeredAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      RegisteredNetworkDevice.countDocuments(filter)
    ]);

    return {
      success: true,
      registeredDevices,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total
      }
    };
  } catch (error) {
    logger.error('[registeredNetworkDeviceService] Get all devices error:', error.message);
    return {
      success: false,
      error: error.message,
      registeredDevices: [],
      pagination: { page: 1, limit: 0, total: 0 }
    };
  }
}

/**
 * Update device last seen time (called when device is discovered)
 */
async function updateDeviceLastSeen(networkDeviceId) {
  try {
    const result = await RegisteredNetworkDevice.updateMany(
      { networkDeviceId, enabled: true },
      { lastSeenAt: new Date() }
    );

    return {
      success: true,
      updatedCount: result.modifiedCount
    };
  } catch (error) {
    logger.error('[registeredNetworkDeviceService] Update last seen error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

export {
  linkDeviceToStudent,
  unlinkDeviceFromStudent,
  getStudentRegisteredDevices,
  getDeviceStudentInfo,
  getAllRegisteredDevices,
  updateDeviceLastSeen
};
