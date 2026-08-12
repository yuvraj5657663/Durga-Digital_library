import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/index.js';
import logger from './config/logger.js';
import database from './config/database.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { apiLimiter } from './middlewares/rateLimitMiddleware.js';
import { requestLogger } from './middlewares/requestLogger.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import studentPortalRoutes from './routes/studentPortalRoutes.js';
import admissionRoutes from './routes/admissionRoutes.js';
import inquiryRoutes from './routes/inquiryRoutes.js';
import admissionInquiryRoutes from './routes/admissionInquiryRoutes.js';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: config.env === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  hsts: config.env === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = config.cors.allowedOrigins;
    
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow all origins in development if none specified
    if (config.env === 'development' && allowedOrigins.length === 0) {
      return callback(null, true);
    }
    
    // Allow localhost in development
    if (config.env === 'development' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    
    // Check whitelist
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // In production, if ALLOWED_ORIGINS is empty, allow the domain
    if (config.env === 'production' && allowedOrigins.length === 0) {
      const domainOrigins = ['https://durgadigitallibrary.online', 'http://durgadigitallibrary.online', 'https://www.durgadigitallibrary.online'];
      if (domainOrigins.includes(origin)) {
        return callback(null, true);
      }
    }
    
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type']
}));

// Body parsing middleware
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Logging middleware
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Request logging for audit trail
app.use(requestLogger);

// Rate limiting
app.use('/api/', apiLimiter);

// Comprehensive health check endpoint
app.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.env,
    version: '2.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    platform: process.platform,
    nodeVersion: process.version,
    services: {
      database: {
        status: database.isReady() ? 'connected' : 'disconnected',
        connection: database.getConnection()?.connection?.host || 'unknown'
      },
      whatsapp: {
        status: global.whatsappClient && global.whatsappClient.info?.wid ? 'connected' : 'disconnected',
        ready: global.isWaReady || false
      },
      email: {
        status: config.email.user ? 'configured' : 'not_configured'
      }
    },
    checks: {
      environment: true,
      database: database.isReady(),
      dependencies: true
    }
  };

  // Additional health checks
  try {
    // Check disk space
    const fs = await import('fs');
    const stats = await fs.promises.stat('./');
    healthCheck.disk = {
      available: stats.size !== undefined
    };
  } catch (err) {
    healthCheck.disk = { available: false, error: err.message };
  }

  const statusCode = healthCheck.services.database.status === 'connected' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/student', studentPortalRoutes);
app.use('/api/v1/online-admissions', admissionRoutes);
app.use('/api/v1/inquiries', inquiryRoutes);
app.use('/api/v1/admission', admissionInquiryRoutes);

// 404 — JSON response for unmatched /api/* paths only
// Non-API paths (e.g. /student, /admin) are React Router client-side routes —
// they should never reach Express; Vite serves index.html for them in dev.
app.use('/api', notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
