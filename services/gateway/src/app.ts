import express from 'express';
import _helmet from 'helmet';
const helmet = _helmet as any;
import cors from 'cors';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import { formatSuccess, formatError, AppError } from '@fintap/shared';
import { globalLimiter, loginLimiter, attendanceLimiter } from './middleware/rate-limiter.js';
import { jwtValidation } from './middleware/jwt-validation.js';
import { proxyMiddleware } from './middleware/proxy.js';
import { swaggerRouter } from './config/swagger.js';

const app = express();

// Attach request ID to every request
app.use((req, _res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  next();
});

// Security headers
app.use(helmet());

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || ['http://localhost:3010'];
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

// Body parsing with 10MB limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use(morgan('combined'));

// Tiered rate limiting
app.use(globalLimiter);
app.post('/api/auth/login', loginLimiter);
app.use('/api/attendances', attendanceLimiter);

// Health check endpoint (before auth middleware so it's always accessible)
app.get('/health', (_req, res) => {
  res.status(200).json(formatSuccess('OK', {
    status: 'ok',
    service: 'gateway',
    timestamp: new Date().toISOString(),
  }));
});

// Swagger documentation (public, no JWT required)
app.use(swaggerRouter);

// JWT validation — skips public endpoints automatically
app.use(jwtValidation);

// Proxy middleware - forwards requests to downstream services
app.use(proxyMiddleware);

// 404 fallthrough handler
app.use((_req, res) => {
  res.status(404).json(formatError('Not found', 'NOT_FOUND'));
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(formatError(err.message, err.code, err.errors));
    return;
  }

  const statusCode = (err as any).statusCode || 500;
  const code = (err as any).code || 'INTERNAL_ERROR';
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Internal server error';

  res.status(statusCode).json(formatError(message, code));
});

export default app;
