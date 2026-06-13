import { Router } from 'express';
import { locationController } from '../controllers/location.controller.js';
import { extractUser, requireAdmin } from '../middleware/internal-auth.js';

const router = Router();

// Apply user extraction middleware to all routes
router.use(extractUser);

// GET /locations - List all locations (all authenticated users)
router.get('/', (req, res, next) => locationController.list(req, res, next));

// POST /locations - Create a new location (admin only)
router.post('/', requireAdmin, (req, res, next) => locationController.create(req, res, next));

// PUT /locations/:id - Update a location (admin only)
router.put('/:id', requireAdmin, (req, res, next) => locationController.update(req, res, next));

export default router;
