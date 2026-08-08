import logger from '../config/logger.js';

export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request details
  logger.info({
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id,
    role: req.user?.role,
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info({
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id,
      role: req.user?.role,
    });
  });

  next();
};
