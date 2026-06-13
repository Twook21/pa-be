import { Router } from 'express';
import { calendarController } from '../controllers/calendar.controller.js';
import { extractUser, requireAdmin } from '../middleware/internal-auth.js';

const router = Router();

// Apply user extraction middleware to all routes
router.use(extractUser);

// GET /calendars - List calendar entries with optional year/month query params
router.get('/', (req, res, next) => calendarController.list(req, res, next));

// POST /calendars/sync - Manually trigger calendar sync from external API (admin only)
router.post('/sync', requireAdmin, (req, res, next) => calendarController.sync(req, res, next));

export default router;
