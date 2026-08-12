import app from './app.js';
import database from './config/database.js';
import config from './config/index.js';
import logger from './config/logger.js';
import { startCronJobs } from './jobs/cronJobs.js';
import { setupWhatsApp } from './jobs/whatsappSetup.js';
import { validateEnvironment } from './utils/startupValidation.js';

// Handle unhandled promise rejections — log but don't exit (server stays up)
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // WhatsApp or other background async failures must never kill the HTTP server
  // Only exit if this is a truly fatal DB / startup error
});

// Handle uncaught exceptions — distinguish fatal vs non-fatal
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error.message);
  logger.error('Stack:', error.stack);

  // WhatsApp / Chromium / Puppeteer errors: log and continue
  const isWhatsAppError =
    error.message?.includes('authStrategy') ||
    error.message?.includes('puppeteer') ||
    error.message?.includes('Chromium') ||
    error.message?.includes('chrome') ||
    error.message?.includes('whatsapp') ||
    error.stack?.includes('whatsappSetup');

  if (isWhatsAppError) {
    logger.warn('Non-fatal WhatsApp error caught — HTTP server will continue running');
    console.warn('[WA] Non-fatal error — server continues:', error.message);
    return; // ← DO NOT exit
  }

  // Truly fatal errors (DB corruption, port in use, missing modules) — must exit
  logger.error('Fatal uncaught exception — process will exit');
  process.exit(1);
});

// Graceful shutdown function (defined outside to avoid scope issues)
let serverInstance = null;

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  if (serverInstance) {
    serverInstance.close(async () => {
      logger.info('HTTP server closed');
      
      try {
        await database.disconnect();
        logger.info('Database disconnected');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown:', err);
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Set up signal handlers at the top level
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Environment validation
const validation = validateEnvironment();
if (!validation.valid) {
  console.error('Environment validation failed. See logs for details.');
  process.exit(1);
}

if (config.env === 'production') {
  logger.info('🔒 Production mode enabled');
} else {
  logger.info('🛠️  Development mode enabled');
}

// Keep the process alive by making the main execution async and never resolving
(async () => {
  // Start the server immediately to keep the process alive
  console.log('Starting server immediately...');
  serverInstance = app.listen(config.port, config.host);

  console.log(`🚀 Server running on ${config.host}:${config.port}`);
  console.log(`📚 ${config.app.name}`);
  console.log(`🌍 Environment: ${config.env}`);
  console.log(`🏥 Health check: http://${config.host}:${config.port}/health`);
  console.log('Server started successfully');

  // Connect to database asynchronously (non-blocking)
  database.connect().then(() => {
    console.log('Database connected successfully');

    // ── Start WhatsApp (async, non-blocking) ─────────────────────────
    if (!config.whatsapp.disabled) {
      console.log('🤳 Starting WhatsApp client setup (async, non-blocking)…');
      setupWhatsApp()
        .then((client) => {
          if (client) {
            console.log('🤳 WhatsApp client initialisation started — waiting for QR scan…');
          } else {
            console.log('🤳 WhatsApp setup returned null — running without WhatsApp');
          }
        })
        .catch((err) => {
          console.error('WhatsApp setup rejected (server continues):', err.message);
        });
    } else {
      console.log('🤳 WhatsApp disabled — skipping');
    }

    // Start cron jobs (pure in-process timers — no risk of crashing server)
    console.log('Starting cron jobs...');
    try {
      startCronJobs();
      console.log('Cron jobs started');
    } catch (error) {
      console.error('Failed to start cron jobs:', error);
    }

    console.log('Server initialization complete');
  }).catch(err => {
    console.error('Failed to connect to database:', err);
    console.error('Database connection failed, but server continues running');
  });

  // Keep the async function from ever resolving
  await new Promise(() => {});
})();
