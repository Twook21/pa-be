import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { internalAuth } from '../middleware/internal-auth.js';

const router = Router();

// All internal routes require the x-internal-service header
router.use(internalAuth);

// POST /internal/notifications/send - Send notification (from other services)
router.post('/notifications/send', (req, res, next) => notificationController.send(req, res, next));

export default router;
