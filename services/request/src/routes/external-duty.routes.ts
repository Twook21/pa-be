import { Router } from 'express';
import { externalDutyController } from '../controllers/external-duty.controller.js';
import { extractUser, requireAdmin } from '../middleware/internal-auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// Apply user extraction middleware to all routes
router.use(extractUser);

// GET / - List external duties (user sees own, admin sees all)
router.get('/', (req, res, next) => externalDutyController.list(req, res, next));

// POST / - Create a new external duty request (any authenticated user)
router.post('/', upload.single('document'), (req, res, next) => externalDutyController.create(req, res, next));

// GET /:id - Get external duty by ID
router.get('/:id', (req, res, next) => externalDutyController.getById(req, res, next));

// PUT /:id/approve - Approve an external duty (admin only)
router.put('/:id/approve', requireAdmin, (req, res, next) => externalDutyController.approve(req, res, next));

// PUT /:id/reject - Reject an external duty (admin only)
router.put('/:id/reject', requireAdmin, (req, res, next) => externalDutyController.reject(req, res, next));

// POST /:id/process - Process (approve/reject) an external duty (admin only)
router.post('/:id/process', requireAdmin, (req, res, next) => externalDutyController.process(req, res, next));

// DELETE /:id - Delete an external duty
router.delete('/:id', (req, res, next) => externalDutyController.delete(req, res, next));

export default router;
