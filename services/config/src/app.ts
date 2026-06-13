import express from 'express';
import { formatSuccess, formatError } from '@fintap/shared';
import locationRoutes from './routes/location.routes.js';
import attendanceSettingsRoutes from './routes/attendance-settings.routes.js';
import calendarRoutes from './routes/calendar.routes.js';
import internalRoutes from './routes/internal.routes.js';

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json(formatSuccess('OK', {
    status: 'ok',
    service: 'config-service',
    timestamp: new Date().toISOString(),
  }));
});

// Public routes (via gateway)
app.use('/locations', locationRoutes);
app.use('/attendance-settings', attendanceSettingsRoutes);
app.use('/calendars', calendarRoutes);

// Legacy route compat: POST /admin/holidays → sync calendar from API
// Frontend lama memanggil POST /api/admin/holidays
import { calendarController } from './controllers/calendar.controller.js';
import { extractUser, requireAdmin } from './middleware/internal-auth.js';
app.get('/admin/holidays', extractUser, requireAdmin, (req, res, next) => calendarController.listHolidays(req, res, next));
app.post('/admin/holidays', extractUser, requireAdmin, (req, res, next) => calendarController.createHoliday(req, res, next));
app.get('/admin/holidays/:id', extractUser, requireAdmin, (req, res, next) => calendarController.getHolidayById(req, res, next));
app.put('/admin/holidays/:id', extractUser, requireAdmin, (req, res, next) => calendarController.updateHoliday(req, res, next));
app.delete('/admin/holidays/:id', extractUser, requireAdmin, (req, res, next) => calendarController.deleteHoliday(req, res, next));

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
