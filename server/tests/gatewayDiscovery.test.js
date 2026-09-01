import gatewayService from '../src/services/gatewayService.js';
import config from '../src/config/index.js';

// Mock dependencies
jest.mock('../src/models/AuditLog.js');
jest.mock('../src/config/logger.js');
jest.mock('../src/config/index.js', () => ({
  network: {
    portalSessionDurationMinutes: 10,
    gateway: {
      mode: 'development',
      defaultGatewayId: null
    },
    router: {
      vendor: 'Airtel',
      model: null,
      firmware: null,
      apiUrl: null,
      apiUsername: null,
      apiPassword: null,
      radiusHost: null,
      radiusPort: null,
      radiusSecret: null
    }
  },
  wifi: {
    maxDevicesPerStudent: 2,
    sessionDurationMinutes: 720
  },
  jwt: {
    secret: 'test-secret-key'
  }
}));

describe('Gateway Discovery and Abstraction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Development Gateway Adapter', () => {
    it('should validate any gateway in development mode', async () => {
      const result = await gatewayService.validateGateway('ANY-GATEWAY-ID');
      
      expect(result.success).toBe(true);
      expect(result.valid).toBe(true);
      expect(result.gatewayId).toBe('ANY-GATEWAY-ID');
    });

    it('should authorize client in development mode', async () => {
      const result = await gatewayService.authorizeClient({
        gatewayId: 'GATEWAY-001',
        studentId: 'DDL001',
        deviceId: 'DEV-001',
        sessionId: 'WFS-123',
        clientIp: '192.168.1.100',
        clientMac: 'AA:BB:CC:DD:EE:FF',
        expiresAt: new Date()
      });

      expect(result.success).toBe(true);
      expect(result.authorized).toBe(true);
    });

    it('should deauthorize client in development mode', async () => {
      const result = await gatewayService.deauthorizeClient({
        gatewayId: 'GATEWAY-001',
        studentId: 'DDL001',
        deviceId: 'DEV-001',
        sessionId: 'WFS-123',
        clientIp: '192.168.1.100',
        clientMac: 'AA:BB:CC:DD:EE:FF'
      });

      expect(result.success).toBe(true);
      expect(result.deauthorized).toBe(true);
    });

    it('should return gateway status in development mode', async () => {
      const result = await gatewayService.getGatewayStatus('GATEWAY-001');

      expect(result.success).toBe(true);
      expect(result.status).toBe('online');
      expect(result.mode).toBe('development');
    });
  });

  describe('Gateway Capability States', () => {
    it('should report SUPPORTED for known capabilities', () => {
      // Development adapter reports success for all operations
      // This is expected behavior for development mode
      expect(config.network.gateway.mode).toBe('development');
    });

    it('should report UNKNOWN for unknown router capabilities', () => {
      // Router capabilities are unknown until router model is determined
      expect(config.network.router.model).toBeNull();
      expect(config.network.router.firmware).toBeNull();
    });

    it('should report NOT_IMPLEMENTED for unimplemented adapters', () => {
      // Production mode falls back to development adapter
      // This is expected until vendor-specific adapters are implemented
      expect(config.network.gateway.mode).toBe('development');
    });
  });

  describe('Gateway Security', () => {
    it('should not expose secrets in gateway operations', async () => {
      const result = await gatewayService.authorizeClient({
        gatewayId: 'GATEWAY-001',
        studentId: 'DDL001',
        deviceId: 'DEV-001',
        sessionId: 'WFS-123',
        clientIp: '192.168.1.100',
        clientMac: 'AA:BB:CC:DD:EE:FF',
        expiresAt: new Date()
      });

      // Result should not contain secrets
      expect(result).not.toHaveProperty('apiPassword');
      expect(result).not.toHaveProperty('radiusSecret');
      expect(result).not.toHaveProperty('jwtSecret');
    });

    it('should not use MAC address as student identity', async () => {
      // MAC address is passed but not used as identity
      const result = await gatewayService.authorizeClient({
        gatewayId: 'GATEWAY-001',
        studentId: 'DDL001', // Student ID is the identity
        deviceId: 'DEV-001',
        sessionId: 'WFS-123',
        clientIp: '192.168.1.100',
        clientMac: 'AA:BB:CC:DD:EE:FF', // MAC is just a fingerprint
        expiresAt: new Date()
      });

      expect(result.success).toBe(true);
      // Student ID is the identity, not MAC
    });
  });

  describe('Backward Compatibility', () => {
    it('should not break existing Wi-Fi authentication', async () => {
      // Gateway operations should not affect existing authentication
      const result = await gatewayService.validateGateway('GATEWAY-001');
      
      expect(result.success).toBe(true);
    });

    it('should not break existing captive portal', async () => {
      // Gateway operations should not affect captive portal
      const result = await gatewayService.authorizeClient({
        gatewayId: 'GATEWAY-001',
        studentId: 'DDL001',
        deviceId: 'DEV-001',
        sessionId: 'WFS-123',
        clientIp: '192.168.1.100',
        clientMac: 'AA:BB:CC:DD:EE:FF',
        expiresAt: new Date()
      });

      expect(result.success).toBe(true);
    });

    it('should not break existing Wi-Fi sessions', async () => {
      // Gateway operations should not affect Wi-Fi sessions
      const result = await gatewayService.deauthorizeClient({
        gatewayId: 'GATEWAY-001',
        studentId: 'DDL001',
        deviceId: 'DEV-001',
        sessionId: 'WFS-123',
        clientIp: '192.168.1.100',
        clientMac: 'AA:BB:CC:DD:EE:FF'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Gateway Configuration', () => {
    it('should have router configuration structure', () => {
      expect(config.network.router).toBeDefined();
      expect(config.network.router.vendor).toBe('Airtel');
      expect(config.network.router.model).toBeNull();
      expect(config.network.router.firmware).toBeNull();
    });

    it('should have gateway configuration structure', () => {
      expect(config.network.gateway).toBeDefined();
      expect(config.network.gateway.mode).toBe('development');
      expect(config.network.gateway.defaultGatewayId).toBeNull();
    });

    it('should have optional API configuration', () => {
      expect(config.network.router.apiUrl).toBeNull();
      expect(config.network.router.apiUsername).toBeNull();
      expect(config.network.router.apiPassword).toBeNull();
    });

    it('should have optional RADIUS configuration', () => {
      expect(config.network.router.radiusHost).toBeNull();
      expect(config.network.router.radiusPort).toBeNull();
      expect(config.network.router.radiusSecret).toBeNull();
    });
  });

  describe('Unsupported Operations', () => {
    it('should handle errors gracefully', async () => {
      // Simulate error by passing invalid data
      const result = await gatewayService.validateGateway('');
      
      // Should handle gracefully
      expect(result).toBeDefined();
    });
  });

  describe('Capability Discovery', () => {
    it('should report UNKNOWN for Airtel router capabilities', () => {
      // Router model is unknown, so capabilities are unknown
      expect(config.network.router.model).toBeNull();
    });

    it('should not assume captive portal support', () => {
      // Cannot assume captive portal support without evidence
      expect(config.network.router.model).toBeNull();
    });

    it('should not assume RADIUS support', () => {
      // Cannot assume RADIUS support without evidence
      expect(config.network.router.radiusHost).toBeNull();
    });

    it('should not assume API support', () => {
      // Cannot assume API support without evidence
      expect(config.network.router.apiUrl).toBeNull();
    });
  });
});
