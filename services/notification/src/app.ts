import express from 'express';
import { formatSuccess, formatError } from '@fintap/shared';
import notificationRoutes from './routes/notification.routes.js';
import userLocationRoutes from './routes/user-location.routes.js';
import internalRoutes from './routes/internal.routes.js';

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json(formatSuccess('OK', {
    status: 'ok',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
  }));
});

// Public routes (via gateway)
app.use('/notifications', notificationRoutes);
app.use('/user-locations', userLocationRoutes);

// Internal routes (inter-service communication)
app.use('/internal', internalRoutes);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const statusCode = (err as any).statusCode || 500;
  const code = (err as any).code || 'INTERNAL_ERROR';
  const message = err.message || 'Internal server error';

  res.status(statusCode).json(formatError(message, code, (err as any).errors));
});

export default app;
