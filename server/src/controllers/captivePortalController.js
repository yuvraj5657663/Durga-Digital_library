import { successResponse, errorResponse } from '../utils/response.js';
import { asyncHandler, NotFoundError, ValidationError } from '../utils/errors.js';
import {
  initiatePortalSession,
  authenticatePortalSession,
  logoutPortalSession,
  getPortalSessionStatus,
  expirePortalSession
} from '../services/captivePortalService.js';
import CaptivePortalSession from '../models/CaptivePortalSession.js';
import WiFiSession from '../models/WiFiSession.js';
import gatewayService from '../services/gatewayService.js';
import gatewayProductionReadinessService from '../services/gatewayProductionReadinessService.js';
import config from '../config/index.js';
import logger from '../config/logger.js';

/**
 * Portal Entry API
 * GET /api/v1/network/portal
 * Initiates a captive portal session
 */
export const portalEntryController = asyncHandler(async (req, res) => {
  const { gatewayId } = req.headers;
  const { redirect_url } = req.query;
  
  const clientIp = req.ip || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || '';
  const clientMac = req.headers['x-client-mac'] || '';

  if (!gatewayId) {
    throw new ValidationError('Gateway ID is required in x-gateway-id header');
  }

  const result = await initiatePortalSession({
    gatewayId,
    clientIp,
    clientMac,
    originalUrl: redirect_url,
    userAgent,
    connectionType: 'wifi'
  });

  if (!result.success) {
    return errorResponse(res, {
      success: false,
      code: result.code,
      message: result.code
    }, 400);
  }

  // Return portal session info
  return successResponse(res, {
    success: true,
    portalSessionId: result.portalSession.portalSessionId,
    expiresAt: result.portalSession.expiresAt,
    gatewayId: result.portalSession.gatewayId
  }, 'Portal session initiated');
});

/**
 * Portal Authentication API
 * POST /api/v1/network/portal/authenticate
 * Authenticates student through captive portal
 */
export const portalAuthenticateController = asyncHandler(async (req, res) => {
  const { portalSessionId, studentId, mobile, deviceInfo } = req.body;

  if (!portalSessionId || !studentId || !mobile) {
    throw new ValidationError('portalSessionId, studentId, and mobile are required');
  }

  const clientIp = req.ip || req.socket.remoteAddress;

  const result = await authenticatePortalSession({
    portalSessionId,
    studentId,
    mobile,
    deviceInfo,
    clientIp
  });

  if (!result.success) {
    return errorResponse(res, {
      success: false,
      authorized: false,
      code: result.code,
      message: result.code
    }, 400);
  }

  return successResponse(res, {
    success: true,
    authorized: true,
    portalSession: {
      portalSessionId: result.portalSession.portalSessionId,
      status: result.portalSession.status
    },
    wifiSession: {
      sessionId: result.wifiSession.sessionId,
      token: result.wifiToken,
      expiresAt: result.wifiSession.expiresAt
    },
    student: {
      studentId: result.student.studentId,
      name: result.student.name
    },
    device: {
      deviceId: result.device.deviceId,
      status: result.device.status
    },
    network: {
      gatewayId: result.portalSession.gatewayId,
      ipAddress: result.portalSession.client.ipAddress,
      connectionType: 'wifi'
    }
  }, 'Authentication successful');
});

/**
 * Portal Logout API
 * POST /api/v1/network/portal/logout
 * Logs out from captive portal
 */
export const portalLogoutController = asyncHandler(async (req, res) => {
  const { portalSessionId } = req.body;

  if (!portalSessionId) {
    throw new ValidationError('portalSessionId is required');
  }

  const result = await logoutPortalSession(portalSessionId);

  if (!result.success) {
    return errorResponse(res, {
      success: false,
      code: result.code,
      message: result.code
    }, 400);
  }

  return successResponse(res, {
    success: true,
    message: 'Logout successful'
  }, 'Portal logout successful');
});

/**
 * Portal Status API
 * GET /api/v1/network/portal/status/:portalSessionId
 * Returns portal session status
 */
export const portalStatusController = asyncHandler(async (req, res) => {
  const { portalSessionId } = req.params;

  const result = await getPortalSessionStatus(portalSessionId);

  if (!result.success) {
    return errorResponse(res, {
      success: false,
      code: result.code,
      message: result.code
    }, 404);
  }

  return successResponse(res, {
    success: true,
    portalSessionId: result.portalSession.portalSessionId,
    status: result.portalSession.status,
    expiresAt: result.portalSession.expiresAt,
    student: result.portalSession.student ? {
      studentId: result.portalSession.student.studentId,
      name: result.portalSession.student.name
    } : null,
    wifiSession: result.portalSession.wifiSession ? {
      sessionId: result.portalSession.wifiSession.sessionId,
      status: result.portalSession.wifiSession.status,
      expiresAt: result.portalSession.wifiSession.expiresAt
    } : null
  }, 'Portal status retrieved');
});

/**
 * Admin: Get all portal sessions
 * GET /api/v1/admin/network/portal/sessions
 */
export const getAllPortalSessionsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status, gatewayId, studentId, date } = req.query;
  
  const filter = {};
  if (status) filter.status = status;
  if (gatewayId) filter.gatewayId = gatewayId;
  if (studentId) {
    const Student = (await import('../models/Student.js')).default;
    const student = await Student.findOne({ studentId });
    if (student) filter.student = student._id;
  }
  if (date) {
    const dateStart = new Date(date);
    const dateEnd = new Date(date);
    dateEnd.setDate(dateEnd.getDate() + 1);
    filter.createdAt = { $gte: dateStart, $lt: dateEnd };
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [sessions, total] = await Promise.all([
    CaptivePortalSession.find(filter)
      .populate('student', 'studentId name')
      .populate('device', 'deviceId deviceInfo')
      .populate('wifiSession', 'sessionId status expiresAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10)),
    CaptivePortalSession.countDocuments(filter)
  ]);

  return successResponse(res, {
    sessions,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total
    }
  }, 'Portal sessions retrieved');
});

/**
 * Admin: Get portal session details
 * GET /api/v1/admin/network/portal/sessions/:portalSessionId
 */
export const getPortalSessionController = asyncHandler(async (req, res) => {
  const { portalSessionId } = req.params;

  const session = await CaptivePortalSession.findOne({ portalSessionId })
    .populate('student', 'studentId name mobile email')
    .populate('device', 'deviceId deviceInfo')
    .populate('wifiSession', 'sessionId status expiresAt');

  if (!session) {
    throw new NotFoundError('Portal session not found');
  }

  return successResponse(res, session, 'Portal session retrieved');
});

/**
 * Admin: Expire portal session
 * POST /api/v1/admin/network/portal/sessions/:portalSessionId/expire
 */
export const expirePortalSessionController = asyncHandler(async (req, res) => {
  const { portalSessionId } = req.params;

  const result = await expirePortalSession(portalSessionId);

  if (!result.success) {
    return errorResponse(res, {
      success: false,
      code: result.code,
      message: result.code
    }, 400);
  }

  return successResponse(res, result.portalSession, 'Portal session expired');
});

/**
 * Admin: Gateway diagnostics
 * GET /api/v1/admin/network/gateway/status
 */
export const gatewayDiagnosticsController = asyncHandler(async (req, res) => {
  const gatewayStatus = await gatewayService.getGatewayStatus(config.network.gateway.defaultGatewayId || 'GATEWAY-001');
  const capabilities = gatewayService.getCapabilities();
  const isConfigured = gatewayService.isConfigured();
  const provider = gatewayService.getProvider();

  const diagnostics = {
    vendor: config.network.router.vendor || 'UNKNOWN',
    model: config.network.router.model || null,
    firmware: config.network.router.firmware || null,
    mode: config.network.gateway.mode,
    provider: provider,
    connectivity: gatewayStatus.success ? 'reachable' : 'unreachable',
    configured: isConfigured,
    adapterStatus: gatewayStatus.adapterStatus || (isConfigured ? 'ready' : 'not_configured'),
    https: true, // Based on discovery
    capabilities: {
      captivePortal: capabilities.captivePortal ? 'SUPPORTED' : 'NOT_SUPPORTED',
      clientAuthorization: capabilities.clientAuthorization ? 'SUPPORTED' : 'NOT_SUPPORTED',
      clientDeauthorization: capabilities.clientDeauthorization ? 'SUPPORTED' : 'NOT_SUPPORTED',
      clientStatus: capabilities.clientStatus ? 'SUPPORTED' : 'NOT_SUPPORTED',
      sessionManagement: capabilities.sessionManagement ? 'SUPPORTED' : 'NOT_SUPPORTED',
      vlan: capabilities.vlan ? 'SUPPORTED' : 'NOT_SUPPORTED',
      radius: capabilities.radius ? 'SUPPORTED' : 'NOT_SUPPORTED',
      api: capabilities.api ? 'SUPPORTED' : 'NOT_SUPPORTED'
    },
    timestamp: gatewayStatus.timestamp || new Date().toISOString()
  };

  return successResponse(res, diagnostics, 'Gateway diagnostics retrieved');
});

/**
 * Admin: Gateway production readiness
 * GET /api/v1/admin/network/gateway/readiness
 */
export const gatewayReadinessController = asyncHandler(async (req, res) => {
  const readiness = await gatewayProductionReadinessService.checkReadiness();

  return successResponse(res, readiness, 'Gateway production readiness check completed');
});

/**
 * Admin: Gateway health monitoring
 * GET /api/v1/admin/network/gateway/health
 */
export const gatewayHealthController = asyncHandler(async (req, res) => {
  const healthMetrics = gatewayService.getHealthMetrics();
  const activeSessions = await WiFiSession.countDocuments({ status: 'active' });

  const health = {
    ...healthMetrics,
    activeSessions,
    timestamp: new Date().toISOString()
  };

  return successResponse(res, health, 'Gateway health metrics retrieved');
});
