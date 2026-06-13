import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { extractUser } from '../middleware/internal-auth.js';

const router = Router();

// All notification routes need user context from gateway headers
router.use(extractUser);

// GET /notifications - List notifications (paginated)
router.get('/', (req, res, next) => notificationController.list(req, res, next));

// PUT /notifications/read-all - Mark all notifications as read (must be before /:id/read)
router.put('/read-all', (req, res, next) => notificationController.markAllAsRead(req, res, next));

// PUT /notifications/:id/read - Mark a single notification as read
router.put('/:id/read', (req, res, next) => notificationController.markAsRead(req, res, next));

export default router;
