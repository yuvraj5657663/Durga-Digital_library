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

async function startServer() {
  try {
    // Environment validation
    const validation = validateEnvironment();
    if (!validation.valid) {
      throw new Error('Environment validation failed. See logs for details.');
    }

    if (config.env === 'production') {
      logger.info('🔒 Production mode enabled');
    } else {
      logger.info('🛠️  Development mode enabled');
    }

    // Connect to database
    await database.connect();
    logger.info('Database connected successfully');

    // ── Start HTTP server FIRST — keeps the event loop alive unconditionally ──
    const server = app.listen(config.port, config.host, () => {
      logger.info(`🚀 Server running on ${config.host}:${config.port}`);
      logger.info(`📚 ${config.app.name}`);
      logger.info(`🌍 Environment: ${config.env}`);
      logger.info(`🏥 Health check: http://${config.host}:${config.port}/health`);

      // ── Start WhatsApp INSIDE the listen callback ─────────────────────────
      // This guarantees the HTTP server is fully bound before Chromium/puppeteer
      // starts.  Any WhatsApp failure here CANNOT crash the already-listening
      // server because the event loop is kept alive by the server socket.
      if (!config.whatsapp.disabled) {
        logger.info('🤳 Starting WhatsApp client setup (async, non-blocking)…');
        setupWhatsApp()
          .then((client) => {
            if (client) {
              logger.info('🤳 WhatsApp client initialisation started — waiting for QR scan…');
            } else {
              logger.warn('🤳 WhatsApp setup returned null — running without WhatsApp');
            }
          })
          .catch((err) => {
            // setupWhatsApp already swallows errors internally; this is extra safety
            logger.error('WhatsApp setup rejected (server continues):', err.message);
          });
      } else {
        logger.info('🤳 WhatsApp disabled — skipping');
      }
    });

    // Start cron jobs (pure in-process timers — no risk of crashing server)
    startCronJobs();

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
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

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
