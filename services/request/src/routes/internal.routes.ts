import { Router } from 'express';
import { externalDutyController } from '../controllers/external-duty.controller.js';
import { internalAuth } from '../middleware/internal-auth.js';

const router = Router();

// All internal routes require the x-internal-service header
router.use(internalAuth);

// GET /internal/external-duties/by-user-date?user_id=X&date=YYYY-MM-DD
// Used by Attendance Service to check if user has approved external duty on a date
router.get('/external-duties/by-user-date', (req, res, next) => externalDutyController.getByUserAndDate(req, res, next));

export default router;
