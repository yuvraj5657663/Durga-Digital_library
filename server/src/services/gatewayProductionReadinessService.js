import logger from '../config/logger.js';
import config from '../config/index.js';
import gatewayService from './gatewayService.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Gateway Production Readiness Service
 * 
 * Validates whether the gateway integration is ready for production deployment.
 * Performs comprehensive checks on configuration, connectivity, and capabilities.
 */

class GatewayProductionReadinessService {
  /**
   * Check production readiness
   */
  async checkReadiness() {
    const gatewayConfig = config.network.gateway;
    const provider = gatewayConfig.provider || 'development';
    const mode = gatewayConfig.mode || 'development';

    await AuditLog.create({
      action: 'gateway_readiness_check',
      actorId: null,
      actorRole: 'system',
      actorName: 'Gateway Production Readiness Service',
      targetType: 'Gateway',
      targetId: gatewayConfig.defaultGatewayId || 'unknown',
      targetName: provider,
      details: {
        provider,
        mode
      }
    });

    const checks = {
      providerConfigured: this.checkProviderConfigured(provider),
      gatewayIdConfigured: this.checkGatewayIdConfigured(gatewayConfig.defaultGatewayId),
      credentialsConfigured: this.checkCredentialsConfigured(provider, gatewayConfig),
      endpointConfigured: this.checkEndpointConfigured(provider, gatewayConfig),
      adapterAvailable: this.checkAdapterAvailable(provider),
      connectivity: false, // Will be checked asynchronously
      requiredCapabilities: false, // Will be checked
      securityConfiguration: this.checkSecurityConfiguration(mode)
    };

    const blockers = [];
    const recommendations = [];

    // Check provider
    if (!checks.providerConfigured) {
      blockers.push('Gateway provider is not configured');
    }

    // Check gateway ID
    if (!checks.gatewayIdConfigured) {
      blockers.push('Gateway ID is not configured');
    }

    // Check credentials for production providers
    if (provider !== 'development' && !checks.credentialsConfigured) {
      blockers.push('Gateway credentials are not configured');
    }

    // Check endpoint for production providers
    if (provider !== 'development' && !checks.endpointConfigured) {
      blockers.push('Gateway endpoint is not configured');
    }

    // Check adapter availability
    if (!checks.adapterAvailable) {
      blockers.push('Gateway adapter is not available for the specified provider');
    }

    // Check security configuration
    if (!checks.securityConfiguration) {
      blockers.push('Security configuration is invalid');
      recommendations.push('Ensure gateway mode is not "development" for production');
    }

    // Check connectivity (only if configured)
    if (checks.providerConfigured && checks.endpointConfigured && provider !== 'development') {
      const connectivityResult = await this.checkConnectivity(provider, gatewayConfig);
      checks.connectivity = connectivityResult.success;
      
      if (!connectivityResult.success) {
        blockers.push('Gateway connectivity check failed');
        recommendations.push('Verify gateway is reachable from the application server');
      }
    }

    // Check required capabilities
    const capabilities = gatewayService.getCapabilities();
    checks.requiredCapabilities = this.checkRequiredCapabilities(capabilities);
    
    if (!checks.requiredCapabilities) {
      blockers.push('Gateway does not support required capabilities');
      recommendations.push('Ensure gateway supports client authorization and deauthorization');
    }

    // Determine overall readiness
    const ready = blockers.length === 0 && checks.securityConfiguration;

    // Add recommendations for development mode
    if (provider === 'development' && mode === 'development') {
      recommendations.push('Development mode is suitable for testing but not for production');
      recommendations.push('Configure a production gateway provider (mikrotik, pfsense, or ubiquiti) for production deployment');
    }

    return {
      ready,
      provider,
      mode,
      environment: config.env,
      checks,
      blockers,
      recommendations,
      capabilities,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if provider is configured
   */
  checkProviderConfigured(provider) {
    return !!provider && provider !== 'development' || provider === 'development';
  }

  /**
   * Check if gateway ID is configured
   */
  checkGatewayIdConfigured(gatewayId) {
    return !!gatewayId;
  }

  /**
   * Check if credentials are configured
   */
  checkCredentialsConfigured(provider, gatewayConfig) {
    if (provider === 'development') {
      return true; // Development doesn't require credentials
    }

    switch (provider) {
      case 'mikrotik':
        return !!(gatewayConfig.username && gatewayConfig.password);
      case 'pfsense':
        return !!(gatewayConfig.apiUsername && gatewayConfig.apiPassword);
      case 'ubiquiti':
        return !!(gatewayConfig.apiUsername && gatewayConfig.apiPassword);
      default:
        return false;
    }
  }

  /**
   * Check if endpoint is configured
   */
  checkEndpointConfigured(provider, gatewayConfig) {
    if (provider === 'development') {
      return true; // Development doesn't require endpoint
    }

    switch (provider) {
      case 'mikrotik':
        return !!gatewayConfig.host;
      case 'pfsense':
        return !!gatewayConfig.apiUrl;
      case 'ubiquiti':
        return !!gatewayConfig.apiUrl;
      default:
        return false;
    }
  }

  /**
   * Check if adapter is available
   */
  checkAdapterAvailable(provider) {
    const availableProviders = ['development', 'mikrotik', 'pfsense', 'ubiquiti'];
    return availableProviders.includes(provider);
  }

  /**
   * Check security configuration
   */
  checkSecurityConfiguration(mode) {
    // In production, mode should not be 'development'
    if (config.env === 'production' && mode === 'development') {
      return false;
    }
    return true;
  }

  /**
   * Check gateway connectivity
   */
  async checkConnectivity(provider, gatewayConfig) {
    try {
      const gatewayId = gatewayConfig.defaultGatewayId || 'test-gateway';
      const result = await gatewayService.validateGateway(gatewayId);
      
      await AuditLog.create({
        action: 'gateway_connectivity_check',
        actorId: null,
        actorRole: 'system',
        actorName: 'Gateway Production Readiness Service',
        targetType: 'Gateway',
        targetId: gatewayId,
        targetName: provider,
        details: {
          success: result.success,
          valid: result.valid
        }
      });

      return {
        success: result.success && result.valid,
        message: result.message
      };
    } catch (error) {
      logger.error('[GatewayProductionReadinessService] Connectivity check error:', error.message);
      
      await AuditLog.create({
        action: 'gateway_connectivity_check',
        actorId: null,
        actorRole: 'system',
        actorName: 'Gateway Production Readiness Service',
        targetType: 'Gateway',
        targetId: gatewayConfig.defaultGatewayId || 'unknown',
        targetName: provider,
        details: {
          success: false,
          error: error.message
        }
      });

      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Check required capabilities
   */
  checkRequiredCapabilities(capabilities) {
    // Required capabilities for captive portal integration
    const requiredCapabilities = [
      'clientAuthorization',
      'clientDeauthorization'
    ];

    return requiredCapabilities.every(cap => capabilities[cap] === true);
  }
}

// Export singleton instance
const gatewayProductionReadinessService = new GatewayProductionReadinessService();

export default gatewayProductionReadinessService;
