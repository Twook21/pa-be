import { Router } from 'express';
import { locationController } from '../controllers/location.controller.js';
import { attendanceSettingsController } from '../controllers/attendance-settings.controller.js';
import { calendarController } from '../controllers/calendar.controller.js';
import { internalAuth } from '../middleware/internal-auth.js';

const router = Router();

// All internal routes require the x-internal-service header
router.use(internalAuth);

// GET /internal/locations/current - Get current active location
router.get('/locations/current', (req, res, next) => locationController.getCurrent(req, res, next));

// GET /internal/attendance-settings/active - Get active attendance settings
router.get('/attendance-settings/active', (req, res, next) => attendanceSettingsController.getActive(req, res, next));

// GET /internal/calendars/is-holiday/:date - Check if a date is a holiday
router.get('/calendars/is-holiday/:date', (req, res, next) => calendarController.checkHoliday(req, res, next));

// GET /internal/calendars/holidays - Get holidays list
router.get('/calendars/holidays', (req, res, next) => calendarController.getHolidays(req, res, next));

export default router;
