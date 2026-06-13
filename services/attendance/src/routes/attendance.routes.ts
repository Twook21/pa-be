import { Router } from 'express';
import * as attendanceController from '../controllers/attendance.controller.js';
import { internalAuth } from '../middleware/internal-auth.js';

const router = Router();

// All attendance routes require authentication (gateway handles JWT, we check headers)
router.post('/check-in', internalAuth, attendanceController.checkIn);
router.post('/check-out', internalAuth, attendanceController.checkOut);
router.get('/stats', internalAuth, attendanceController.getStats);
router.get('/today', internalAuth, attendanceController.getToday);
router.get('/history', internalAuth, attendanceController.getHistory);
router.get('/detail/:date', internalAuth, attendanceController.getDetail);

export default router;
