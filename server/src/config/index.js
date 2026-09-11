import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  // Explicitly bind to 0.0.0.0 in production for external access
  // Localhost binding in development, 0.0.0.0 in production
  host: process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost'),
  
  database: {
    uri: process.env.MONGODB_URI,
  },
  
  jwt: {
    secret:         process.env.JWT_SECRET || 'development-only-secret-change-me',
    // Support both JWT_EXPIRES_IN (legacy) and the more explicit keys
    accessExpires:  process.env.JWT_ACCESS_EXPIRES  || process.env.JWT_EXPIRES_IN || '8h',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  
  admin: {
    user:  process.env.ADMIN_USER  || 'admin',
    pass:  process.env.ADMIN_PASS  || 'admin123',
    email: process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'admin@durga-library.local',
  },
  
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || 'Durga Library <noreply@durgalibrary.com>',
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
  },
  
  whatsapp: {
    // WhatsApp is disabled by default
    // Enable by setting WHATSAPP_ENABLED=true (and ensure DISABLE_WHATSAPP is not set to true)
    disabled: !(process.env.WHATSAPP_ENABLED === 'true' && process.env.DISABLE_WHATSAPP !== 'true'),
  },
  
  cors: {
    // Support both ALLOWED_ORIGINS (comma-separated) and CORS_ORIGIN (single value)
    allowedOrigins: (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '')
      .split(',')
      .map(o => o.trim())
      .filter(Boolean),
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },
  
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024,
    dir: process.env.UPLOAD_DIR || 'uploads',
  },
  
  app: {
    name: process.env.APP_NAME || 'Durga Digital Library',
    url: process.env.APP_URL || 'http://localhost:3000',
  },

  wifi: {
    maxDevicesPerStudent: parseInt(process.env.MAX_WIFI_DEVICES_PER_STUDENT, 10) || 2,
    sessionDurationMinutes: parseInt(process.env.WIFI_SESSION_DURATION_MINUTES, 10) || 720,
    maxRegisteredNetworkDevicesPerStudent: parseInt(process.env.MAX_REGISTERED_NETWORK_DEVICES_PER_STUDENT, 10) || 2,
  },

  network: {
    portalSessionDurationMinutes: parseInt(process.env.NETWORK_PORTAL_SESSION_DURATION_MINUTES, 10) || 10,
    gateway: {
      mode: process.env.NETWORK_GATEWAY_MODE || 'development',
      provider: process.env.NETWORK_GATEWAY_PROVIDER || 'development',
      defaultGatewayId: process.env.NETWORK_GATEWAY_ID || null,
      // MikroTik configuration
      host: process.env.NETWORK_GATEWAY_HOST || null,
      port: parseInt(process.env.NETWORK_GATEWAY_PORT, 10) || null,
      username: process.env.NETWORK_GATEWAY_USERNAME || null,
      password: process.env.NETWORK_GATEWAY_PASSWORD || null,
      // PfSense/Ubiquiti configuration
      apiUrl: process.env.NETWORK_GATEWAY_API_URL || null,
      apiUsername: process.env.NETWORK_GATEWAY_API_USERNAME || null,
      apiPassword: process.env.NETWORK_GATEWAY_API_PASSWORD || null
    },
    router: {
      vendor: process.env.NETWORK_ROUTER_VENDOR || null,
      model: process.env.NETWORK_ROUTER_MODEL || null,
      firmware: process.env.NETWORK_ROUTER_FIRMWARE || null,
      radiusHost: process.env.NETWORK_GATEWAY_RADIUS_HOST || null,
      radiusPort: process.env.NETWORK_GATEWAY_RADIUS_PORT || null,
      radiusSecret: process.env.NETWORK_GATEWAY_RADIUS_SECRET || null
    },
    agent: {
      id: process.env.NETWORK_AGENT_ID || null,
      secret: process.env.NETWORK_AGENT_SECRET || null,
      deviceOfflineMinutes: parseInt(process.env.NETWORK_AGENT_DEVICE_OFFLINE_MINUTES, 10) || 5
    }
  },
};

export default config;
