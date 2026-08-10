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
  // In production always bind to 0.0.0.0 so Nginx (on the same machine) can reach it.
  // 'localhost' / '127.0.0.1' works too as long as Nginx proxies to 127.0.0.1:3000,
  // but 0.0.0.0 is safer and avoids "connection refused" on some distros.
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
  },
  
  whatsapp: {
    disabled: true, // Disabled for development
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
};

export default config;
