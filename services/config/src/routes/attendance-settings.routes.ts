import { Router } from 'express';
import { attendanceSettingsController } from '../controllers/attendance-settings.controller.js';
import { extractUser, requireAdmin } from '../middleware/internal-auth.js';

const router = Router();

// Apply user extraction middleware to all routes
router.use(extractUser);

// GET /attendance-settings - List attendance settings (all authenticated users)
router.get('/', (req, res, next) => attendanceSettingsController.list(req, res, next));

// PUT /attendance-settings - Update attendance settings (admin only)
router.put('/', requireAdmin, (req, res, next) => attendanceSettingsController.update(req, res, next));

export default router;
