import { successResponse, errorResponse } from '../utils/response.js';
import { asyncHandler, ValidationError } from '../utils/errors.js';
import {
  processAgentDevices,
  getDevicesForAdmin
} from '../services/networkDeviceService.js';
import logger from '../config/logger.js';

/**
 * Receive device discovery data from network agent
 * Authenticated with networkAgentAuth middleware
 */
export const receiveAgentDevicesController = asyncHandler(async (req, res) => {
  const { agentId, timestamp, devices } = req.body;

  if (!agentId || !timestamp || !Array.isArray(devices)) {
    throw new ValidationError('Invalid request body: agentId, timestamp, and devices array required');
  }

  if (agentId !== req.agent.id) {
    throw new ValidationError('Agent ID mismatch');
  }

  const requestTimestamp = new Date(timestamp);
  const now = new Date();
  const maxAge = 60000; // 60 seconds

  if (now - requestTimestamp > maxAge) {
    throw new ValidationError('Discovery data timestamp too old');
  }

  if (requestTimestamp > now + maxAge) {
    throw new ValidationError('Discovery data timestamp in future');
  }

  const result = await processAgentDevices(agentId, devices);

  if (!result.success) {
    return errorResponse(res, {
      success: false,
      error: result.error
    }, 500);
  }

  logger.info(`[networkDeviceController] Received ${devices.length} devices from agent ${agentId}`);

  return successResponse(res, result.results, 'Devices processed successfully');
});

/**
 * Get all network devices for admin display
 */
export const getNetworkDevicesController = asyncHandler(async (req, res) => {
  const { status, limit } = req.query;

  const result = await getDevicesForAdmin({ status, limit });

  if (!result.success) {
    return errorResponse(res, {
      success: false,
      error: result.error
    }, 500);
  }

  return successResponse(res, {
    devices: result.devices,
    agentHeartbeat: result.agentHeartbeat
  }, 'Network devices retrieved successfully');
});
