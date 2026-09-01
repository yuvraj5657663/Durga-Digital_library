/**
 * Test-compatible config
 * 
 * This config is used by Jest tests to avoid import.meta issues.
 * The production config uses import.meta which is not compatible with Jest's CommonJS environment.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

// Safety guard: Prevent tests from connecting to production database
const nodeEnv = process.env.NODE_ENV || 'test';
const mongoUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/durga-library-test';

// Production database patterns to detect
const productionPatterns = [
  /mongodb\+srv:\/\/.*\.mongodb\.net/, // MongoDB Atlas
  /production/i,
  /prod/i,
  /durga-library$/i, // Production database name
];

if (nodeEnv === 'test') {
  const isProductionUri = productionPatterns.some(pattern => pattern.test(mongoUri));
  if (isProductionUri) {
    throw new Error(
      'SAFETY GUARD: Tests are attempting to connect to a production database. ' +
      'Set MONGODB_TEST_URI to a test database URI. ' +
      'Current URI: ' + mongoUri.replace(/:([^:@]+)@/, ':****@') // Mask password
    );
  }
}

export const config = {
  env: nodeEnv,
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || 'localhost',
  
  database: {
    uri: mongoUri,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'test-secret-key',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '8h',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  
  admin: {
    user: process.env.ADMIN_USER || 'admin',
    pass: process.env.ADMIN_PASS || 'admin123',
    email: process.env.ADMIN_EMAIL || 'admin@test.local',
  },
  
  email: {
    user: process.env.EMAIL_USER || 'test@example.com',
    pass: process.env.EMAIL_PASS || 'test-pass',
    from: process.env.EMAIL_FROM || 'Test <test@example.com>',
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
  },
  
  whatsapp: {
    disabled: true, // Always disabled in tests
  },
  
  cors: {
    allowedOrigins: ['http://localhost:3000'],
  },
  
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
  },
  
  upload: {
    maxFileSize: 5 * 1024 * 1024,
    dir: 'uploads/test',
  },
  
  app: {
    name: process.env.APP_NAME || 'Durga Digital Library Test',
    url: process.env.APP_URL || 'http://localhost:3000',
  },

  wifi: {
    maxDevicesPerStudent: parseInt(process.env.MAX_WIFI_DEVICES_PER_STUDENT, 10) || 2,
    sessionDurationMinutes: parseInt(process.env.WIFI_SESSION_DURATION_MINUTES, 10) || 720,
  },

  network: {
    portalSessionDurationMinutes: parseInt(process.env.NETWORK_PORTAL_SESSION_DURATION_MINUTES, 10) || 10,
    gateway: {
      mode: 'development',
      provider: 'development',
      defaultGatewayId: null,
      host: null,
      port: null,
      username: null,
      password: null,
      apiUrl: null,
      apiUsername: null,
      apiPassword: null
    },
    router: {
      vendor: null,
      model: null,
      firmware: null,
      radiusHost: null,
      radiusPort: null,
      radiusSecret: null
    }
  },
};

export default config;
