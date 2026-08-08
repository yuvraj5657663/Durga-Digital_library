import app from './app.js';
import database from './config/database.js';
import config from './config/index.js';
import logger from './config/logger.js';
import { startCronJobs } from './jobs/cronJobs.js';
import { setupWhatsApp } from './jobs/whatsappSetup.js';
import { validateEnvironment } from './utils/startupValidation.js';

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

    // Setup WhatsApp
    setupWhatsApp();

    // Start cron jobs
    startCronJobs();

    // Start server
    const server = app.listen(config.port, config.host, () => {
      logger.info(`🚀 Server running on ${config.host}:${config.port}`);
      logger.info(`📚 ${config.app.name}`);
      logger.info(`🌍 Environment: ${config.env}`);
      logger.info(`🏥 Health check: http://${config.host}:${config.port}/health`);
    });

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
