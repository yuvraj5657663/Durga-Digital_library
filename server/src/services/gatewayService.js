import logger from '../config/logger.js';
import config from '../config/index.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Gateway Error Codes
 * Structured error codes for gateway operations
 */
const GatewayErrorCodes = {
  GATEWAY_NOT_CONFIGURED: 'GATEWAY_NOT_CONFIGURED',
  GATEWAY_UNAVAILABLE: 'GATEWAY_UNAVAILABLE',
  GATEWAY_AUTHENTICATION_FAILED: 'GATEWAY_AUTHENTICATION_FAILED',
  GATEWAY_AUTHORIZATION_FAILED: 'GATEWAY_AUTHORIZATION_FAILED',
  CLIENT_NOT_FOUND: 'CLIENT_NOT_FOUND',
  CLIENT_DEAUTHORIZATION_FAILED: 'CLIENT_DEAUTHORIZATION_FAILED',
  ADAPTER_NOT_SUPPORTED: 'ADAPTER_NOT_SUPPORTED',
  GATEWAY_CONFIGURATION_ERROR: 'GATEWAY_CONFIGURATION_ERROR',
  GATEWAY_CONNECTIVITY_ERROR: 'GATEWAY_CONNECTIVITY_ERROR'
};

/**
 * Gateway Adapter Interface
 * This provides a vendor-independent abstraction for gateway operations.
 * 
 * In development mode, this uses a mock adapter that logs requests
 * without making actual network changes.
 * 
 * In production, this would be replaced with vendor-specific implementations
 * (MikroTik, Ubiquiti, Cisco, etc.) via adapter pattern.
 */

class GatewayAdapter {
  constructor(config) {
    this.config = config;
    this.mode = config.mode || 'development';
    this.provider = config.provider || 'development';
  }

  /**
   * Authorize a client on the gateway
   */
  async authorizeClient({ gatewayId, studentId, deviceId, sessionId, clientIp, clientMac, expiresAt }) {
    throw new Error('authorizeClient must be implemented by adapter');
  }

  /**
   * Deauthorize a client on the gateway
   */
  async deauthorizeClient({ gatewayId, studentId, deviceId, sessionId, clientIp, clientMac }) {
    throw new Error('deauthorizeClient must be implemented by adapter');
  }

  /**
   * Validate gateway credentials/identity
   */
  async validateGateway(gatewayId) {
    throw new Error('validateGateway must be implemented by adapter');
  }

  /**
   * Get gateway status
   */
  async getGatewayStatus(gatewayId) {
    throw new Error('getGatewayStatus must be implemented by adapter');
  }

  /**
   * Get client status
   */
  async getClientStatus({ gatewayId, clientIp, clientMac }) {
    throw new Error('getClientStatus must be implemented by adapter');
  }

  /**
   * Disconnect client
   */
  async disconnectClient({ gatewayId, clientIp, clientMac }) {
    throw new Error('disconnectClient must be implemented by adapter');
  }

  /**
   * Get adapter capabilities
   */
  getCapabilities() {
    return {
      captivePortal: false,
      clientAuthorization: false,
      clientDeauthorization: false,
      clientStatus: false,
      sessionManagement: false,
      vlan: false,
      radius: false,
      api: false
    };
  }

  /**
   * Check if adapter is configured
   */
  isConfigured() {
    return this.mode === 'development';
  }
}

/**
 * Development/Mock Gateway Adapter
 * 
 * This adapter logs authorization requests without making actual network changes.
 * Safe for development and testing environments.
 */
class DevelopmentGatewayAdapter extends GatewayAdapter {
  async authorizeClient({ gatewayId, studentId, deviceId, sessionId, clientIp, clientMac, expiresAt }) {
    logger.info(`[GatewayAdapter] MOCK authorizeClient:`, {
      gatewayId,
      studentId,
      deviceId,
      sessionId,
      clientIp,
      clientMac,
      expiresAt
    });

    await AuditLog.create({
      action: 'gateway_authorization_requested',
      actorId: null,
      actorRole: 'system',
      actorName: 'Gateway Adapter',
      targetType: 'Gateway',
      targetId: gatewayId,
      targetName: gatewayId,
      details: {
        mode: this.mode,
        provider: this.provider,
        studentId,
        deviceId,
        sessionId,
        clientIp,
        expiresAt: expiresAt?.toISOString()
      }
    });

    // In development, always succeed
    return {
      success: true,
      authorized: true,
      gatewayId,
      clientId: clientIp,
      adapter: 'development',
      mode: this.mode,
      timestamp: new Date().toISOString(),
      message: 'Development mode: Authorization logged (no actual network change)'
    };
  }

  async deauthorizeClient({ gatewayId, studentId, deviceId, sessionId, clientIp, clientMac }) {
    logger.info(`[GatewayAdapter] MOCK deauthorizeClient:`, {
      gatewayId,
      studentId,
      deviceId,
      sessionId,
      clientIp,
      clientMac
    });

    await AuditLog.create({
      action: 'gateway_deauthorization_requested',
      actorId: null,
      actorRole: 'system',
      actorName: 'Gateway Adapter',
      targetType: 'Gateway',
      targetId: gatewayId,
      targetName: gatewayId,
      details: {
        mode: this.mode,
        provider: this.provider,
        studentId,
        deviceId,
        sessionId,
        clientIp
      }
    });

    return {
      success: true,
      deauthorized: true,
      gatewayId,
      clientId: clientIp,
      adapter: 'development',
      mode: this.mode,
      timestamp: new Date().toISOString(),
      message: 'Development mode: Deauthorization logged (no actual network change)'
    };
  }

  async validateGateway(gatewayId) {
    logger.info(`[GatewayAdapter] MOCK validateGateway:`, { gatewayId });

    // In development, accept any gateway ID
    return {
      success: true,
      valid: true,
      gatewayId,
      adapter: 'development',
      mode: this.mode,
      timestamp: new Date().toISOString(),
      message: 'Development mode: Gateway validation passed'
    };
  }

  async getGatewayStatus(gatewayId) {
    logger.info(`[GatewayAdapter] MOCK getGatewayStatus:`, { gatewayId });

    return {
      success: true,
      gatewayId,
      status: 'online',
      adapter: 'development',
      mode: this.mode,
      configured: true,
      reachable: true,
      adapterStatus: 'ready',
      timestamp: new Date().toISOString(),
      message: 'Development mode: Mock status'
    };
  }

  async getClientStatus({ gatewayId, clientIp, clientMac }) {
    logger.info(`[GatewayAdapter] MOCK getClientStatus:`, { gatewayId, clientIp, clientMac });

    return {
      success: true,
      gatewayId,
      clientIp,
      clientMac,
      status: 'authorized',
      adapter: 'development',
      mode: this.mode,
      timestamp: new Date().toISOString(),
      message: 'Development mode: Mock client status'
    };
  }

  async disconnectClient({ gatewayId, clientIp, clientMac }) {
    logger.info(`[GatewayAdapter] MOCK disconnectClient:`, { gatewayId, clientIp, clientMac });

    return {
      success: true,
      gatewayId,
      clientIp,
      clientMac,
      disconnected: true,
      adapter: 'development',
      mode: this.mode,
      timestamp: new Date().toISOString(),
      message: 'Development mode: Client disconnected (no actual network change)'
    };
  }

  getCapabilities() {
    return {
      captivePortal: true,
      clientAuthorization: true,
      clientDeauthorization: true,
      clientStatus: true,
      sessionManagement: true,
      vlan: false,
      radius: false,
      api: true
    };
  }

  isConfigured() {
    return true; // Development adapter is always configured
  }
}

/**
 * MikroTik Gateway Adapter
 * 
 * Production adapter for MikroTik routers.
 * Initially in NOT_CONFIGURED state until physical gateway is deployed.
 */
class MikroTikGatewayAdapter extends GatewayAdapter {
  async authorizeClient({ gatewayId, studentId, deviceId, sessionId, clientIp, clientMac, expiresAt }) {
    // Check if configured
    if (!this.isConfigured()) {
      return {
        success: false,
        authorized: false,
        code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
        gatewayId,
        clientId: clientIp,
        adapter: 'mikrotik',
        mode: this.mode,
        timestamp: new Date().toISOString(),
        message: 'MikroTik gateway is not configured. Please configure gateway credentials and API endpoint.'
      };
    }

    // TODO: Implement actual MikroTik API authorization when configured
    // This will be implemented after physical gateway deployment
    await AuditLog.create({
      action: 'gateway_authorization_requested',
      actorId: null,
      actorRole: 'system',
      actorName: 'MikroTik Gateway Adapter',
      targetType: 'Gateway',
      targetId: gatewayId,
      targetName: gatewayId,
      details: {
        mode: this.mode,
        provider: this.provider,
        studentId,
        deviceId,
        sessionId,
        clientIp
      }
    });

    return {
      success: false,
      authorized: false,
      code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
      gatewayId,
      clientId: clientIp,
      adapter: 'mikrotik',
      mode: this.mode,
      timestamp: new Date().toISOString(),
      message: 'MikroTik gateway authorization not yet implemented. Physical gateway deployment required.'
    };
  }

  async deauthorizeClient({ gatewayId, studentId, deviceId, sessionId, clientIp, clientMac }) {
    if (!this.isConfigured()) {
      return {
        success: false,
        deauthorized: false,
        code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
        gatewayId,
        clientId: clientIp,
        adapter: 'mikrotik',
        mode: this.mode,
        timestamp: new Date().toISOString(),
        message: 'MikroTik gateway is not configured.'
      };
    }

    // TODO: Implement actual MikroTik API deauthorization when configured
    return {
      success: false,
      deauthorized: false,
      code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
      gatewayId,
      clientId: clientIp,
      adapter: 'mikrotik',
      mode: this.mode,
      timestamp: new Date().toISOString(),
      message: 'MikroTik gateway deauthorization not yet implemented.'
    };
  }

  async validateGateway(gatewayId) {
    if (!this.isConfigured()) {
      return {
        success: false,
        valid: false,
        code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
        gatewayId,
        adapter: 'mikrotik',
        mode: this.mode,
        timestamp: new Date().toISOString(),
        message: 'MikroTik gateway is not configured.'
      };
    }

    return {
      success: false,
      valid: false,
      code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
      gatewayId,
      adapter: 'mikrotik',
      mode: this.mode,
      timestamp: new Date().toISOString(),
      message: 'MikroTik gateway validation not yet implemented.'
    };
  }

  async getGatewayStatus(gatewayId) {
    if (!this.isConfigured()) {
      return {
        success: true,
        gatewayId,
        status: 'offline',
        adapter: 'mikrotik',
        mode: this.mode,
        configured: false,
        reachable: false,
        adapterStatus: 'not_configured',
        timestamp: new Date().toISOString(),
        message: 'MikroTik gateway is not configured.'
      };
    }

    return {
      success: true,
      gatewayId,
      status: 'offline',
      adapter: 'mikrotik',
      mode: this.mode,
      configured: false,
      reachable: false,
      adapterStatus: 'not_configured',
      timestamp: new Date().toISOString(),
      message: 'MikroTik gateway status not yet implemented.'
    };
  }

  async getClientStatus({ gatewayId, clientIp, clientMac }) {
    if (!this.isConfigured()) {
      return {
        success: false,
        code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
        gatewayId,
        clientIp,
        clientMac,
        adapter: 'mikrotik',
        mode: this.mode,
        timestamp: new Date().toISOString(),
        message: 'MikroTik gateway is not configured.'
      };
    }

    return {
      success: false,
      code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
      gatewayId,
      clientIp,
      clientMac,
      adapter: 'mikrotik',
      mode: this.mode,
      timestamp: new Date().toISOString(),
      message: 'MikroTik client status not yet implemented.'
    };
  }

  async disconnectClient({ gatewayId, clientIp, clientMac }) {
    if (!this.isConfigured()) {
      return {
        success: false,
        code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
        gatewayId,
        clientIp,
        clientMac,
        adapter: 'mikrotik',
        mode: this.mode,
        timestamp: new Date().toISOString(),
        message: 'MikroTik gateway is not configured.'
      };
    }

    return {
      success: false,
      code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
      gatewayId,
      clientIp,
      clientMac,
      adapter: 'mikrotik',
      mode: this.mode,
      timestamp: new Date().toISOString(),
      message: 'MikroTik client disconnect not yet implemented.'
    };
  }

  getCapabilities() {
    return {
      captivePortal: true,
      clientAuthorization: true,
      clientDeauthorization: true,
      clientStatus: true,
      sessionManagement: true,
      vlan: true,
      radius: true,
      api: true
    };
  }

  isConfigured() {
    // Check if required configuration is present
    return !!(
      this.config.host &&
      this.config.username &&
      this.config.password
    );
  }
}

/**
 * PfSense Gateway Adapter
 * 
 * Production adapter for PfSense firewalls.
 * Initially in NOT_CONFIGURED state until physical gateway is deployed.
 */
class PfSenseGatewayAdapter extends GatewayAdapter {
  async authorizeClient({ gatewayId, studentId, deviceId, sessionId, clientIp, clientMac, expiresAt }) {
    if (!this.isConfigured()) {
      return {
        success: false,
        authorized: false,
        code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
        gatewayId,
        clientId: clientIp,
        adapter: 'pfsense',
        mode: this.mode,
        timestamp: new Date().toISOString(),
        message: 'PfSense gateway is not configured. Please configure gateway credentials and API endpoint.'
      };
    }

    // TODO: Implement actual PfSense API authorization when configured
    await AuditLog.create({
      action: 'gateway_authorization_requested',
      actorId: null,
      actorRole: 'system',
      actorName: 'PfSense Gateway Adapter',
      targetType: 'Gateway',
      targetId: gatewayId,
      targetName: gatewayId,
      details: {
        mode: this.mode,
        provider: this.provider,
        studentId,
        deviceId,
        sessionId,
        clientIp
      }
    });

    return {
      success: false,
      authorized: false,
      code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
      gatewayId,
      clientId: clientIp,
      adapter: 'pfsense',
      mode: this.mode,
      timestamp: new Date().toISOString(),
      message: 'PfSense gateway authorization not yet implemented. Physical gateway deployment required.'
    };
  }

  async deauthorizeClient({ gatewayId, studentId, deviceId, sessionId, clientIp, clientMac }) {
    if (!this.isConfigured()) {
      return {
        success: false,
        deauthorized: false,
        code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
        gatewayId,
        clientId: clientIp,
        adapter: 'pfsense',
        mode: this.mode,
        timestamp: new Date().toISOString(),
        message: 'PfSense gateway is not configured.'
      };
    }

    return {
      success: false,
      deauthorized: false,
      code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
      gatewayId,
      clientId: clientIp,
      adapter: 'pfsense',
      mode: this.mode,
      timestamp: new Date().toISOString(),
      message: 'PfSense gateway deauthorization not yet implemented.'
    };
  }

  async validateGateway(gatewayId) {
    if (!this.isConfigured()) {
      return {
        success: false,
        valid: false,
        code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
        gatewayId,
        adapter: 'pfsense',
        mode: this.mode,
        timestamp: new Date().toISOString(),
        message: 'PfSense gateway is not configured.'
      };
    }

    return {
      success: false,
      valid: false,
      code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
      gatewayId,
      adapter: 'pfsense',
      mode: this.mode,
      timestamp: new Date().toISOString(),
      message: 'PfSense gateway validation not yet implemented.'
    };
  }

  async getGatewayStatus(gatewayId) {
    if (!this.isConfigured()) {
      return {
        success: true,
        gatewayId,
        status: 'offline',
        adapter: 'pfsense',
        mode: this.mode,
        configured: false,
        reachable: false,
        adapterStatus: 'not_configured',
        timestamp: new Date().toISOString(),
        message: 'PfSense gateway is not configured.'
      };
    }

    return {
      success: true,
      gatewayId,
      status: 'offline',
      adapter: 'pfsense',
      mode: this.mode,
      configured: false,
      reachable: false,
      adapterStatus: 'not_configured',
      timestamp: new Date().toISOString(),
      message: 'PfSense gateway status not yet implemented.'
    };
  }

  async getClientStatus({ gatewayId, clientIp, clientMac }) {
    if (!this.isConfigured()) {
      return {
        success: false,
        code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
        gatewayId,
        clientIp,
        clientMac,
        adapter: 'pfsense',
        mode: this.mode,
        timestamp: new Date().toISOString(),
        message: 'PfSense gateway is not configured.'
      };
    }

    return {
      success: false,
      code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
      gatewayId,
      clientIp,
      clientMac,
      adapter: 'pfsense',
      mode: this.mode,
      timestamp: new Date().toISOString(),
      message: 'PfSense client status not yet implemented.'
    };
  }

  async disconnectClient({ gatewayId, clientIp, clientMac }) {
    if (!this.isConfigured()) {
      return {
        success: false,
        code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
        gatewayId,
        clientIp,
        clientMac,
        adapter: 'pfsense',
        mode: this.mode,
        timestamp: new Date().toISOString(),
        message: 'PfSense gateway is not configured.'
      };
    }

    return {
      success: false,
      code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
      gatewayId,
      clientIp,
      clientMac,
      adapter: 'pfsense',
      mode: this.mode,
      timestamp: new Date().toISOString(),
      message: 'PfSense client disconnect not yet implemented.'
    };
  }

  getCapabilities() {
    return {
      captivePortal: true,
      clientAuthorization: true,
      clientDeauthorization: true,
      clientStatus: true,
      sessionManagement: true,
      vlan: true,
      radius: true,
      api: true
    };
  }

  isConfigured() {
    return !!(
      this.config.apiUrl &&
      this.config.username &&
      this.config.password
    );
  }
}

/**
 * Ubiquiti Gateway Adapter
 * 
 * Production adapter for Ubiquiti gateways.
 * Initially in NOT_CONFIGURED state until physical gateway is deployed.
 */
class UbiquitiGatewayAdapter extends GatewayAdapter {
  async authorizeClient({ gatewayId, studentId, deviceId, sessionId, clientIp, clientMac, expiresAt }) {
    if (!this.isConfigured()) {
      return {
        success: false,
        authorized: false,
        code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
        gatewayId,
        clientId: clientIp,
        adapter: 'ubiquiti',
        mode: this.mode,
        timestamp: new Date().toISOString(),
        message: 'Ubiquiti gateway is not configured. Please configure gateway credentials and API endpoint.'
      };
    }

    // TODO: Implement actual Ubiquiti API authorization when configured
    await AuditLog.create({
      action: 'gateway_authorization_requested',
      actorId: null,
      actorRole: 'system',
      actorName: 'Ubiquiti Gateway Adapter',
      targetType: 'Gateway',
      targetId: gatewayId,
      targetName: gatewayId,
      details: {
        mode: this.mode,
        provider: this.provider,
        studentId,
        deviceId,
        sessionId,
        clientIp
      }
    });

    return {
      success: false,
      authorized: false,
      code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
      gatewayId,
      clientId: clientIp,
      adapter: 'ubiquiti',
      mode: this.mode,
      timestamp: new Date().toISOString(),
      message: 'Ubiquiti gateway authorization not yet implemented. Physical gateway deployment required.'
    };
  }

  async deauthorizeClient({ gatewayId, studentId, deviceId, sessionId, clientIp, clientMac }) {
    if (!this.isConfigured()) {
      return {
        success: false,
        deauthorized: false,
        code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
        gatewayId,
        clientId: clientIp,
        adapter: 'ubiquiti',
        mode: this.mode,
        timestamp: new Date().toISOString(),
        message: 'Ubiquiti gateway is not configured.'
      };
    }

    return {
      success: false,
      deauthorized: false,
      code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
      gatewayId,
      clientId: clientIp,
      adapter: 'ubiquiti',
      mode: this.mode,
      timestamp: new Date().toISOString(),
      message: 'Ubiquiti gateway deauthorization not yet implemented.'
    };
  }

  async validateGateway(gatewayId) {
    if (!this.isConfigured()) {
      return {
        success: false,
        valid: false,
        code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
        gatewayId,
        adapter: 'ubiquiti',
        mode: this.mode,
        timestamp: new Date().toISOString(),
        message: 'Ubiquiti gateway is not configured.'
      };
    }

    return {
      success: false,
      valid: false,
      code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
      gatewayId,
      adapter: 'ubiquiti',
      mode: this.mode,
      timestamp: new Date().toISOString(),
      message: 'Ubiquiti gateway validation not yet implemented.'
    };
  }

  async getGatewayStatus(gatewayId) {
    if (!this.isConfigured()) {
      return {
        success: true,
        gatewayId,
        status: 'offline',
        adapter: 'ubiquiti',
        mode: this.mode,
        configured: false,
        reachable: false,
        adapterStatus: 'not_configured',
        timestamp: new Date().toISOString(),
        message: 'Ubiquiti gateway is not configured.'
      };
    }

    return {
      success: true,
      gatewayId,
      status: 'offline',
      adapter: 'ubiquiti',
      mode: this.mode,
      configured: false,
      reachable: false,
      adapterStatus: 'not_configured',
      timestamp: new Date().toISOString(),
      message: 'Ubiquiti gateway status not yet implemented.'
    };
  }

  async getClientStatus({ gatewayId, clientIp, clientMac }) {
    if (!this.isConfigured()) {
      return {
        success: false,
        code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
        gatewayId,
        clientIp,
        clientMac,
        adapter: 'ubiquiti',
        mode: this.mode,
        timestamp: new Date().toISOString(),
        message: 'Ubiquiti gateway is not configured.'
      };
    }

    return {
      success: false,
      code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
      gatewayId,
      clientIp,
      clientMac,
      adapter: 'ubiquiti',
      mode: this.mode,
      timestamp: new Date().toISOString(),
      message: 'Ubiquiti client status not yet implemented.'
    };
  }

  async disconnectClient({ gatewayId, clientIp, clientMac }) {
    if (!this.isConfigured()) {
      return {
        success: false,
        code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
        gatewayId,
        clientIp,
        clientMac,
        adapter: 'ubiquiti',
        mode: this.mode,
        timestamp: new Date().toISOString(),
        message: 'Ubiquiti gateway is not configured.'
      };
    }

    return {
      success: false,
      code: GatewayErrorCodes.GATEWAY_NOT_CONFIGURED,
      gatewayId,
      clientIp,
      clientMac,
      adapter: 'ubiquiti',
      mode: this.mode,
      timestamp: new Date().toISOString(),
      message: 'Ubiquiti client disconnect not yet implemented.'
    };
  }

  getCapabilities() {
    return {
      captivePortal: true,
      clientAuthorization: true,
      clientDeauthorization: true,
      clientStatus: true,
      sessionManagement: true,
      vlan: true,
      radius: true,
      api: true
    };
  }

  isConfigured() {
    return !!(
      this.config.apiUrl &&
      this.config.username &&
      this.config.password
    );
  }
}

/**
 * Gateway Service
 * 
 * Main service that uses the appropriate adapter based on configuration.
 */
class GatewayService {
  constructor() {
    this.adapter = this.createAdapter();
    this.healthMetrics = {
      lastSuccessfulConnectivityCheck: null,
      lastFailedConnectivityCheck: null,
      lastAuthorization: null,
      lastAuthorizationFailure: null,
      lastDeauthorization: null,
      lastDeauthorizationFailure: null,
      authorizationSuccessCount: 0,
      authorizationFailureCount: 0,
      deauthorizationSuccessCount: 0,
      deauthorizationFailureCount: 0
    };
  }

  createAdapter() {
    const gatewayConfig = config.network.gateway;
    const provider = gatewayConfig.provider || 'development';

    // Log adapter selection asynchronously
    this.logAdapterSelection(provider, gatewayConfig);

    switch (provider) {
      case 'development':
        return new DevelopmentGatewayAdapter(gatewayConfig);
      
      case 'mikrotik':
        return new MikroTikGatewayAdapter(gatewayConfig);
      
      case 'pfsense':
        return new PfSenseGatewayAdapter(gatewayConfig);
      
      case 'ubiquiti':
        return new UbiquitiGatewayAdapter(gatewayConfig);
      
      default:
        logger.error(`[GatewayService] Unknown gateway provider: ${provider}`);
        return {
          authorizeClient: async () => ({
            success: false,
            authorized: false,
            code: GatewayErrorCodes.ADAPTER_NOT_SUPPORTED,
            message: `Unknown gateway provider: ${provider}`
          }),
          deauthorizeClient: async () => ({
            success: false,
            deauthorized: false,
            code: GatewayErrorCodes.ADAPTER_NOT_SUPPORTED,
            message: `Unknown gateway provider: ${provider}`
          }),
          validateGateway: async () => ({
            success: false,
            valid: false,
            code: GatewayErrorCodes.ADAPTER_NOT_SUPPORTED,
            message: `Unknown gateway provider: ${provider}`
          }),
          getGatewayStatus: async () => ({
            success: false,
            code: GatewayErrorCodes.ADAPTER_NOT_SUPPORTED,
            message: `Unknown gateway provider: ${provider}`
          }),
          getClientStatus: async () => ({
            success: false,
            code: GatewayErrorCodes.ADAPTER_NOT_SUPPORTED,
            message: `Unknown gateway provider: ${provider}`
          }),
          disconnectClient: async () => ({
            success: false,
            code: GatewayErrorCodes.ADAPTER_NOT_SUPPORTED,
            message: `Unknown gateway provider: ${provider}`
          }),
          getCapabilities: () => ({
            captivePortal: false,
            clientAuthorization: false,
            clientDeauthorization: false,
            clientStatus: false,
            sessionManagement: false,
            vlan: false,
            radius: false,
            api: false
          }),
          isConfigured: () => false
        };
    }
  }

  async logAdapterSelection(provider, gatewayConfig) {
    try {
      await AuditLog.create({
        action: 'gateway_adapter_selected',
        actorId: null,
        actorRole: 'system',
        actorName: 'Gateway Service',
        targetType: 'Gateway',
        targetId: gatewayConfig.defaultGatewayId || 'unknown',
        targetName: provider,
        details: {
          provider,
          mode: gatewayConfig.mode
        }
      });
    } catch (error) {
      logger.error('[GatewayService] Failed to log adapter selection:', error.message);
    }
  }

  /**
   * Authorize a client on the gateway
   */
  async authorizeClient({ gatewayId, studentId, deviceId, sessionId, clientIp, clientMac, expiresAt }) {
    try {
      const result = await this.adapter.authorizeClient({
        gatewayId,
        studentId,
        deviceId,
        sessionId,
        clientIp,
        clientMac,
        expiresAt
      });

      if (result.success) {
        this.healthMetrics.lastAuthorization = new Date().toISOString();
        this.healthMetrics.authorizationSuccessCount++;
        
        await AuditLog.create({
          action: 'gateway_authorization_success',
          actorId: null,
          actorRole: 'system',
          actorName: 'Gateway Service',
          targetType: 'Gateway',
          targetId: gatewayId,
          targetName: gatewayId,
          details: {
            studentId,
            deviceId,
            sessionId,
            clientIp
          }
        });
      } else {
        this.healthMetrics.lastAuthorizationFailure = new Date().toISOString();
        this.healthMetrics.authorizationFailureCount++;
        
        await AuditLog.create({
          action: 'gateway_authorization_failed',
          actorId: null,
          actorRole: 'system',
          actorName: 'Gateway Service',
          targetType: 'Gateway',
          targetId: gatewayId,
          targetName: gatewayId,
          details: {
            reason: result.message,
            code: result.code,
            studentId,
            deviceId,
            sessionId,
            clientIp
          }
        });
      }

      return result;
    } catch (error) {
      logger.error('[GatewayService] Authorization error:', error.message);
      
      this.healthMetrics.lastAuthorizationFailure = new Date().toISOString();
      this.healthMetrics.authorizationFailureCount++;
      
      await AuditLog.create({
        action: 'gateway_authorization_failed',
        actorId: null,
        actorRole: 'system',
        actorName: 'Gateway Service',
        targetType: 'Gateway',
        targetId: gatewayId,
        targetName: gatewayId,
        details: {
          reason: error.message,
          studentId,
          deviceId,
          sessionId,
          clientIp
        }
      });

      return {
        success: false,
        authorized: false,
        error: error.message
      };
    }
  }

  /**
   * Deauthorize a client from the gateway
   */
  async deauthorizeClient({ gatewayId, studentId, deviceId, sessionId, clientIp, clientMac }) {
    try {
      const result = await this.adapter.deauthorizeClient({
        gatewayId,
        studentId,
        deviceId,
        sessionId,
        clientIp,
        clientMac
      });

      if (result.success) {
        this.healthMetrics.lastDeauthorization = new Date().toISOString();
        this.healthMetrics.deauthorizationSuccessCount++;
        
        await AuditLog.create({
          action: 'gateway_deauthorization_success',
          actorId: null,
          actorRole: 'system',
          actorName: 'Gateway Service',
          targetType: 'Gateway',
          targetId: gatewayId,
          targetName: gatewayId,
          details: {
            studentId,
            deviceId,
            sessionId,
            clientIp
          }
        });
      } else {
        this.healthMetrics.lastDeauthorizationFailure = new Date().toISOString();
        this.healthMetrics.deauthorizationFailureCount++;
        
        await AuditLog.create({
          action: 'gateway_deauthorization_failed',
          actorId: null,
          actorRole: 'system',
          actorName: 'Gateway Service',
          targetType: 'Gateway',
          targetId: gatewayId,
          targetName: gatewayId,
          details: {
            reason: result.message,
            code: result.code,
            studentId,
            deviceId,
            sessionId,
            clientIp
          }
        });
      }

      return result;
    } catch (error) {
      logger.error('[GatewayService] Deauthorization error:', error.message);
      
      this.healthMetrics.lastDeauthorizationFailure = new Date().toISOString();
      this.healthMetrics.deauthorizationFailureCount++;
      
      await AuditLog.create({
        action: 'gateway_deauthorization_failed',
        actorId: null,
        actorRole: 'system',
        actorName: 'Gateway Service',
        targetType: 'Gateway',
        targetId: gatewayId,
        targetName: gatewayId,
        details: {
          reason: error.message,
          studentId,
          deviceId,
          sessionId,
          clientIp
        }
      });

      return {
        success: false,
        deauthorized: false,
        error: error.message
      };
    }
  }

  /**
   * Validate gateway credentials/identity
   */
  async validateGateway(gatewayId) {
    try {
      const result = await this.adapter.validateGateway(gatewayId);
      
      if (result.success && result.valid) {
        this.healthMetrics.lastSuccessfulConnectivityCheck = new Date().toISOString();
      } else {
        this.healthMetrics.lastFailedConnectivityCheck = new Date().toISOString();
      }
      
      return result;
    } catch (error) {
      logger.error('[GatewayService] Gateway validation error:', error.message);
      this.healthMetrics.lastFailedConnectivityCheck = new Date().toISOString();
      return {
        success: false,
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Get gateway status
   */
  async getGatewayStatus(gatewayId) {
    try {
      const result = await this.adapter.getGatewayStatus(gatewayId);
      return result;
    } catch (error) {
      logger.error('[GatewayService] Gateway status error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get client status
   */
  async getClientStatus({ gatewayId, clientIp, clientMac }) {
    try {
      const result = await this.adapter.getClientStatus({ gatewayId, clientIp, clientMac });
      return result;
    } catch (error) {
      logger.error('[GatewayService] Client status error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Disconnect client
   */
  async disconnectClient({ gatewayId, clientIp, clientMac }) {
    try {
      const result = await this.adapter.disconnectClient({ gatewayId, clientIp, clientMac });

      if (result.success) {
        await AuditLog.create({
          action: 'gateway_disconnect_success',
          actorId: null,
          actorRole: 'system',
          actorName: 'Gateway Service',
          targetType: 'Gateway',
          targetId: gatewayId,
          targetName: gatewayId,
          details: {
            clientIp
          }
        });
      } else {
        await AuditLog.create({
          action: 'gateway_disconnect_failed',
          actorId: null,
          actorRole: 'system',
          actorName: 'Gateway Service',
          targetType: 'Gateway',
          targetId: gatewayId,
          targetName: gatewayId,
          details: {
            reason: result.message,
            clientIp
          }
        });
      }

      return result;
    } catch (error) {
      logger.error('[GatewayService] Disconnect error:', error.message);
      
      await AuditLog.create({
        action: 'gateway_disconnect_failed',
        actorId: null,
        actorRole: 'system',
        actorName: 'Gateway Service',
        targetType: 'Gateway',
        targetId: gatewayId,
        targetName: gatewayId,
        details: {
          reason: error.message,
          clientIp
        }
      });

      return {
        success: false,
        disconnected: false,
        error: error.message
      };
    }
  }

  /**
   * Get adapter capabilities
   */
  getCapabilities() {
    return this.adapter.getCapabilities();
  }

  /**
   * Check if adapter is configured
   */
  isConfigured() {
    return this.adapter.isConfigured();
  }

  /**
   * Get current provider
   */
  getProvider() {
    return this.adapter.provider;
  }

  /**
   * Get health metrics
   */
  getHealthMetrics() {
    return {
      ...this.healthMetrics,
      adapterStatus: this.isConfigured() ? 'ready' : 'not_configured',
      gatewayReachable: this.healthMetrics.lastSuccessfulConnectivityCheck !== null,
      capabilities: this.getCapabilities(),
      provider: this.getProvider(),
      mode: this.adapter.mode
    };
  }
}

// Export singleton instance
const gatewayService = new GatewayService();

export default gatewayService;
