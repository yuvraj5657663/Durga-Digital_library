import config from '../config/index.js';
import logger from '../config/logger.js';

export function validateEnvironment() {
  const errors = [];
  const warnings = [];

  // Required environment variables
  const requiredVars = {
    MONGODB_URI: config.database.uri,
    JWT_SECRET: config.jwt.secret,
    ADMIN_USER: config.admin.user,
    ADMIN_PASS: config.admin.pass,
  };

  Object.entries(requiredVars).forEach(([key, value]) => {
    if (!value) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  });

  // JWT secret validation
  if (config.jwt.secret && config.jwt.secret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters in production');
  }

  // CORS validation in production — warn but don't block startup
  // (a missing ALLOWED_ORIGINS means all origins are allowed — acceptable for IP-only access)
  if (config.env === 'production') {
    if (config.cors.allowedOrigins.length === 0) {
      warnings.push('ALLOWED_ORIGINS not set — all origins allowed. Set it to your domain for security.');
    }
  }

  // Email configuration
  if (!config.email.user || !config.email.pass) {
    warnings.push('Email service not configured - email features will be disabled');
  }

  // WhatsApp configuration
  if (!config.whatsapp.disabled) {
    warnings.push('WhatsApp integration enabled - ensure .wwebjs_auth/ directory exists');
  }

  // Node version check
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  if (majorVersion < 18) {
    errors.push(`Node.js version ${nodeVersion} is not supported. Minimum required: 18.0.0`);
  }

  // Port validation
  if (config.port < 1 || config.port > 65535) {
    errors.push(`Invalid PORT: ${config.port}. Must be between 1 and 65535`);
  }

  // Log validation results
  if (errors.length > 0) {
    logger.error('Environment validation failed:', errors);
    errors.forEach(error => console.error(`❌ ${error}`));
  }

  if (warnings.length > 0) {
    logger.warn('Environment validation warnings:', warnings);
    warnings.forEach(warning => console.warn(`⚠️  ${warning}`));
  }

  if (errors.length === 0 && warnings.length === 0) {
    logger.info('✅ Environment validation passed');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
