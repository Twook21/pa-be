import { Router } from 'express';
import { activityController } from '../controllers/activity.controller.js';
import { internalAuth } from '../middleware/internal-auth.js';

const router = Router();

// All internal routes require the x-internal-service header
router.use(internalAuth);

// GET /internal/activities/by-date/:date - Get activity by date (used by Attendance Service)
router.get('/activities/by-date/:date', (req, res, next) => activityController.getByDate(req, res, next));

export default router;
