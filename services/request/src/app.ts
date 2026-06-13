import express from 'express';
import { formatSuccess, formatError } from '@fintap/shared';
import leaveRequestRoutes from './routes/leave-request.routes.js';
import externalDutyRoutes from './routes/external-duty.routes.js';
import internalRoutes from './routes/internal.routes.js';

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json(formatSuccess('OK', {
    status: 'ok',
    service: 'request-service',
    timestamp: new Date().toISOString(),
  }));
});

// Leave request routes (public via gateway at /api/leave-requests)
app.use('/leave-requests', leaveRequestRoutes);

// External duty routes (public via gateway at /api/external-duties)
app.use('/external-duties', externalDutyRoutes);
app.use('/admin/external-duties', externalDutyRoutes);

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
