import { Router } from 'express';
import { leaveRequestController } from '../controllers/leave-request.controller.js';
import { extractUser, requireAdmin } from '../middleware/internal-auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// Apply user extraction middleware to all routes
router.use(extractUser);

// GET / - List leave requests (user sees own, admin sees all)
router.get('/', (req, res, next) => leaveRequestController.list(req, res, next));

// POST / - Create a new leave request (any authenticated user)
router.post('/', upload.single('photo'), (req, res, next) => leaveRequestController.create(req, res, next));

// GET /:id - Get leave request by ID
router.get('/:id', (req, res, next) => leaveRequestController.getById(req, res, next));

// PUT /:id/approve - Approve a leave request (admin only)
router.put('/:id/approve', requireAdmin, (req, res, next) => leaveRequestController.approve(req, res, next));

// PUT /:id/reject - Reject a leave request (admin only)
router.put('/:id/reject', requireAdmin, (req, res, next) => leaveRequestController.reject(req, res, next));

// DELETE /:id - Delete a leave request
router.delete('/:id', (req, res, next) => leaveRequestController.delete(req, res, next));

export default router;
