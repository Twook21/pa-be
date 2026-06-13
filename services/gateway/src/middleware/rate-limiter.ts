import rateLimit from 'express-rate-limit';
import { formatError } from '@fintap/shared';

/**
 * Global rate limiter: 100 requests per 15 minutes per IP
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    const retryAfter = Math.ceil(15 * 60);
    res.status(429).json({
      status: 'error',
      message: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter,
    });
  },
});

/**
 * Login rate limiter: 5 requests per 1 minute per IP
 * Applied to POST /api/auth/login
 */
export const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    const retryAfter = 60;
    res.status(429).json({
      status: 'error',
      message: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter,
    });
  },
});

/**
 * Attendance rate limiter: 10 requests per 1 minute per IP
 * Applied to /api/attendances/*
 */
export const attendanceLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    const retryAfter = 60;
    res.status(429).json({
      status: 'error',
      message: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter,
    });
  },
});
