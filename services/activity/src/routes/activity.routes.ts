import { Router } from 'express';
import { activityController } from '../controllers/activity.controller.js';
import { extractUser, requireAdmin } from '../middleware/internal-auth.js';
import { createS3Uploader } from '@fintap/shared';

const router = Router();
const upload = createS3Uploader('activities', 'activity');

// Apply user extraction middleware to all routes
router.use(extractUser);

// GET / - List activities (all authenticated users)
router.get('/', (req, res, next) => activityController.list(req, res, next));

// POST / - Create activity (admin only)
router.post('/', requireAdmin, upload.single('photo'), (req, res, next) => activityController.create(req, res, next));

// GET /:id - Get activity by ID (all authenticated users)
router.get('/:id', (req, res, next) => activityController.getById(req, res, next));

// PUT /:id - Update activity (admin only)
router.put('/:id', requireAdmin, upload.single('photo'), (req, res, next) => activityController.update(req, res, next));

// DELETE /:id - Delete activity (admin only)
router.delete('/:id', requireAdmin, (req, res, next) => activityController.delete(req, res, next));

export default router;
