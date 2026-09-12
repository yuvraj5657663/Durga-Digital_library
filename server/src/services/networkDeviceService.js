import NetworkDevice from '../models/NetworkDevice.js';
import RegisteredNetworkDevice from '../models/RegisteredNetworkDevice.js';
import logger from '../config/logger.js';
import config from '../config/index.js';

/**
 * Process device discovery data from network agent
 * Upserts devices and updates their status
 */
async function processAgentDevices(agentId, devices) {
  try {
    const results = {
      updated: 0,
      created: 0,
      markedOffline: 0,
      errors: 0
    };

    const now = new Date();
    const offlineThreshold = new Date(now.getTime() - config.network.agent.deviceOfflineMinutes * 60 * 1000);

    // Get all existing devices for this agent
    const existingDevices = await NetworkDevice.find({ agentId });
    const existingMap = new Map();
    existingDevices.forEach(device => {
      const key = `${device.ipAddress}:${device.macAddress}`;
      existingMap.set(key, device);
    });

    const seenKeys = new Set();

    // Process incoming devices
    for (const deviceData of devices) {
      try {
        const key = `${deviceData.ipAddress}:${deviceData.macAddress}`;
        seenKeys.add(key);

        const existing = existingMap.get(key);

        if (existing) {
          // Update existing device
          existing.deviceName = deviceData.deviceName || existing.deviceName;
          existing.hostname = deviceData.hostname || existing.hostname;
          existing.manufacturer = deviceData.manufacturer || existing.manufacturer;
          // Preserve the status from agent (online, recently_seen, or unreachable)
          existing.status = deviceData.status || 'unreachable';
          existing.lastSeen = deviceData.lastSeen || now;
          existing.lastSeenAt = now;
          await existing.save();
          results.updated++;
        } else {
          // Create new device
          await NetworkDevice.create({
            agentId,
            deviceName: deviceData.deviceName || 'Unknown Device',
            hostname: deviceData.hostname || '',
            ipAddress: deviceData.ipAddress,
            macAddress: deviceData.macAddress || '',
            manufacturer: deviceData.manufacturer || '',
            status: deviceData.status || 'unreachable',
            firstSeen: deviceData.firstSeen || now,
            lastSeen: deviceData.lastSeen || now,
            lastSeenAt: now
          });
          results.created++;
        }
      } catch (error) {
        logger.error('[networkDeviceService] Error processing device:', error.message);
        results.errors++;
      }
    }

    // Mark unseen devices as offline
    for (const device of existingDevices) {
      const key = `${device.ipAddress}:${device.macAddress}`;
      if (!seenKeys.has(key)) {
        // Only mark as offline if it hasn't been seen recently
        if (device.lastSeenAt < offlineThreshold) {
          device.status = 'offline';
          await device.save();
          results.markedOffline++;
        }
      }
    }

    logger.info(`[networkDeviceService] Processed ${devices.length} devices from agent ${agentId}:`, results);

    return {
      success: true,
      results
    };
  } catch (error) {
    logger.error('[networkDeviceService] Process devices error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get all devices for admin display
 */
async function getDevicesForAdmin(options = {}) {
  try {
    const { status, limit = 100 } = options;

    const filter = {};
    if (status) {
      filter.status = status;
    }

    const devices = await NetworkDevice.find(filter)
      .sort({ lastSeenAt: -1 })
      .limit(parseInt(limit, 10));

    // Get student linking information for each device
    const networkDeviceIds = devices.map(d => d._id);
    const registeredDevices = await RegisteredNetworkDevice.find({
      networkDeviceId: { $in: networkDeviceIds },
      status: 'active',
      enabled: true
    }).populate('studentId', 'name studentId');

    const deviceStudentMap = new Map();
    registeredDevices.forEach(rd => {
      deviceStudentMap.set(rd.networkDeviceId.toString(), rd.studentId);
    });

    // Add student info to devices
    const devicesWithStudentInfo = devices.map(device => ({
      ...device.toObject(),
      linkedStudent: deviceStudentMap.get(device._id.toString()) || null
    }));

    // Get agent heartbeat status
    const agentHeartbeat = await getAgentHeartbeat();

    return {
      success: true,
      devices: devicesWithStudentInfo,
      agentHeartbeat
    };
  } catch (error) {
    logger.error('[networkDeviceService] Get devices error:', error.message);
    return {
      success: false,
      error: error.message,
      devices: [],
      agentHeartbeat: null
    };
  }
}

/**
 * Get agent heartbeat status
 */
async function getAgentHeartbeat() {
  try {
    const latestDevice = await NetworkDevice.findOne()
      .sort({ lastSeenAt: -1 });

    if (!latestDevice) {
      return {
        status: 'unknown',
        lastSeen: null,
        agentId: null
      };
    }

    const now = new Date();
    const secondsSinceLastSeen = Math.floor((now - latestDevice.lastSeenAt) / 1000);

    let status = 'offline';
    if (secondsSinceLastSeen < 60) {
      status = 'online';
    } else if (secondsSinceLastSeen < 300) {
      status = 'degraded';
    }

    return {
      status,
      lastSeen: latestDevice.lastSeenAt,
      agentId: latestDevice.agentId,
      secondsSinceLastSeen
    };
  } catch (error) {
    logger.error('[networkDeviceService] Get agent heartbeat error:', error.message);
    return {
      status: 'error',
      lastSeen: null,
      agentId: null
    };
  }
}

/**
 * Clean up old offline devices (admin only, optional)
 */
async function cleanupOldDevices(daysOld = 7) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await NetworkDevice.deleteMany({
      status: 'offline',
      lastSeenAt: { $lt: cutoffDate }
    });

    logger.info(`[networkDeviceService] Cleaned up ${result.deletedCount} old offline devices`);

    return {
      success: true,
      deletedCount: result.deletedCount
    };
  } catch (error) {
    logger.error('[networkDeviceService] Cleanup error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get device summary statistics
 */
async function getDeviceSummary() {
  try {
    const now = new Date();
    const recentlySeenThreshold = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes
    const offlineThreshold = new Date(now.getTime() - config.network.agent.deviceOfflineMinutes * 60 * 1000);

    // Get all devices
    const allDevices = await NetworkDevice.find({});

    // Count by status
    const onlineCount = allDevices.filter(d => d.status === 'online').length;
    const recentlySeenCount = allDevices.filter(d => d.status === 'recently_seen').length;
    const unreachableCount = allDevices.filter(d => d.status === 'unreachable').length;
    const offlineCount = allDevices.filter(d => d.status === 'offline').length;

    // Count currently connected (online + recently_seen)
    const currentlyConnected = onlineCount + recentlySeenCount;

    // Get student linking information
    const networkDeviceIds = allDevices.map(d => d._id);
    const registeredDevices = await RegisteredNetworkDevice.find({
      networkDeviceId: { $in: networkDeviceIds },
      status: 'active',
      enabled: true
    });

    const linkedStudentCount = registeredDevices.length;
    const linkedDeviceIds = new Set(registeredDevices.map(rd => rd.networkDeviceId.toString()));
    const unlinkedDeviceCount = networkDeviceIds.length - linkedDeviceIds.size;

    const summary = {
      total: allDevices.length,
      online: onlineCount,
      recentlySeen: recentlySeenCount,
      unreachable: unreachableCount,
      offline: offlineCount,
      currentlyConnected,
      linkedStudents: linkedStudentCount,
      unlinkedDevices: unlinkedDeviceCount
    };

    return {
      success: true,
      summary
    };
  } catch (error) {
    logger.error('[networkDeviceService] Get summary error:', error.message);
    return {
      success: false,
      error: error.message,
      summary: null
    };
  }
}

export {
  processAgentDevices,
  getDevicesForAdmin,
  getAgentHeartbeat,
  cleanupOldDevices,
  getDeviceSummary
};
