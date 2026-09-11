import crypto from 'crypto';
import config from '../config/index.js';
import { AuthenticationError, ValidationError } from '../utils/errors.js';

/**
 * Validate IP address is in private/local range
 */
function isValidPrivateIP(ip) {
  if (!ip) return false;

  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;

  // 10.0.0.0/8
  if (parts[0] === 10) return true;

  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;

  return false;
}

export const networkAgentAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['x-agent-auth'];

    if (!authHeader) {
      throw new AuthenticationError('Agent authentication header required');
    }

    const expectedAgentId = config.network?.agent?.id;
    const expectedAgentSecret = config.network?.agent?.secret;

    if (!expectedAgentId || !expectedAgentSecret) {
      throw new AuthenticationError('Network agent not configured on server');
    }

    const [agentId, timestamp, signature] = authHeader.split(':');

    if (!agentId || !timestamp || !signature) {
      throw new AuthenticationError('Invalid agent authentication format');
    }

    if (agentId !== expectedAgentId) {
      throw new AuthenticationError('Invalid agent ID');
    }

    const ts = parseInt(timestamp, 10);
    const now = Date.now();
    const maxAge = 60000; // 60 seconds

    if (now - ts > maxAge) {
      throw new AuthenticationError('Agent authentication expired');
    }

    if (ts > now + maxAge) {
      throw new AuthenticationError('Agent authentication timestamp in future');
    }

    const expectedSignature = crypto
      .createHmac('sha256', expectedAgentSecret)
      .update(`${agentId}:${timestamp}`)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new AuthenticationError('Invalid agent signature');
    }

    // Validate request body
    if (!req.body || !Array.isArray(req.body.devices)) {
      throw new ValidationError('Invalid request body: devices array required');
    }

    // Validate payload size (max 500 devices per request)
    if (req.body.devices.length > 500) {
      throw new ValidationError('Too many devices in request (max 500)');
    }

    // Validate each device IP is in private range
    for (const device of req.body.devices) {
      if (device.ipAddress && !isValidPrivateIP(device.ipAddress)) {
        throw new ValidationError(`Invalid IP address: ${device.ipAddress} (must be private/local)`);
      }
    }

    req.agent = {
      id: agentId,
      authenticatedAt: new Date()
    };

    next();
  } catch (error) {
    next(error);
  }
};
