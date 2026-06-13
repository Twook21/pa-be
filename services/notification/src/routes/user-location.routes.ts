import { Router } from 'express';
import { userLocationController } from '../controllers/user-location.controller.js';
import { extractUser, requireAdmin } from '../middleware/internal-auth.js';

const router = Router();

// All user-location routes need user context from gateway headers
router.use(extractUser);

// PUT /user-locations - Update current user's location
router.put('/', (req, res, next) => userLocationController.updateLocation(req, res, next));

// GET /user-locations - Get all user locations (admin only)
router.get('/', requireAdmin, (req, res, next) => userLocationController.getAllLocations(req, res, next));

export default router;
