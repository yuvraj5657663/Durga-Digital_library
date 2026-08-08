import rateLimit from 'express-rate-limit';
import config from '../config/index.js';
import { RateLimitError } from '../utils/errors.js';

export const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      throw new RateLimitError('Too many requests, please try again later');
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

export const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10 // 10 attempts
});

export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests
});

export const publicWriteLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30 // 30 requests
});
