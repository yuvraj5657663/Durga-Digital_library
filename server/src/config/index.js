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
  host: process.env.HOST || 'localhost',
  
  database: {
    uri: process.env.MONGODB_URI,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'development-only-secret-change-me',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '1h',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  
  admin: {
    user: process.env.ADMIN_USER || 'admin',
    pass: process.env.ADMIN_PASS || 'admin123',
    email: process.env.ADMIN_EMAIL || 'admin@durga-library.local',
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
    allowedOrigins: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
      : [],
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
