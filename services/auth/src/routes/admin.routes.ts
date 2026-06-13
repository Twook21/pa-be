import { Router, Request, Response, NextFunction } from 'express';
import { formatSuccess } from '@fintap/shared';
import { internalAuth, requireAdmin } from '../middleware/internal-auth.js';
import * as adminDashboardService from '../services/admin-dashboard.service.js';
import * as attendanceReportService from '../services/attendance-report.service.js';

const router = Router();

// All admin routes require authentication + admin role
router.use(internalAuth);
router.use(requireAdmin);

/**
 * GET /admin/dashboard
 * Query: date, division, status, search, activity_id, page, per_page
 */
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      date: (req.query.date as string) || new Date().toISOString().split('T')[0],
      division: req.query.division as string | undefined,
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
      activity_id: req.query.activity_id ? parseInt(req.query.activity_id as string, 10) : undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      per_page: req.query.per_page ? parseInt(req.query.per_page as string, 10) : 10,
    };

    const requestId = req.headers['x-request-id'] as string | undefined;
    const data = await adminDashboardService.getDashboard(filters, requestId);
    res.status(200).json(formatSuccess('Dashboard data retrieved successfully', data));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/attendance/:id
 * Get detailed attendance record with user info.
 */
router.get('/attendance/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ status: 'error', message: 'Invalid attendance ID', code: 'VALIDATION_ERROR' });
      return;
    }

    const requestId = req.headers['x-request-id'] as string | undefined;
    const data = await adminDashboardService.getAttendanceDetail(id, requestId);
    res.status(200).json(formatSuccess('Attendance detail retrieved successfully', data));
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /admin/attendance/:id
 * Update attendance status.
 * Body: { status: "present" | "late" | "absent" | "sakit" | "cuti" | "dinas_luar" }
 */
router.put('/attendance/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ status: 'error', message: 'Invalid attendance ID', code: 'VALIDATION_ERROR' });
      return;
    }

    const { status } = req.body;
    if (!status) {
      res.status(400).json({ status: 'error', message: 'Status is required', code: 'VALIDATION_ERROR' });
      return;
    }

    const requestId = req.headers['x-request-id'] as string | undefined;
    const data = await adminDashboardService.updateAttendanceStatus(id, status, requestId);
    res.status(200).json(formatSuccess('Attendance status updated successfully', data));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/attendance-report
 * Query: month (YYYY-MM format)
 * Returns matrix of attendance per user per day for the given month.
 */
router.get('/attendance-report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const month = req.query.month as string;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      res.status(400).json({
        status: 'error',
        message: 'Month is required in YYYY-MM format',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const requestId = req.headers['x-request-id'] as string | undefined;
    const data = await attendanceReportService.getAttendanceReport(month, requestId);
    res.status(200).json(formatSuccess('Attendance report retrieved successfully', data));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /admin/attendance-report/download
 * Body: { month, signer_name, signer_title, use_custom_order, custom_order }
 * Returns report data (PDF generation handled by frontend or separate service).
 */
router.post('/attendance-report/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { month, signer_name, signer_title, use_custom_order, custom_order } = req.body;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      res.status(400).json({
        status: 'error',
        message: 'Month is required in YYYY-MM format',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const requestId = req.headers['x-request-id'] as string | undefined;
    const data = await attendanceReportService.getAttendanceReport(month, requestId, {
      signer_name,
      signer_title,
      use_custom_order,
      custom_order,
    });
    res.status(200).json(formatSuccess('Attendance report data for download', data));
  } catch (error) {
    next(error);
  }
});

export default router;
