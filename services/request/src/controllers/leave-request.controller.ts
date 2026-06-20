import { Request, Response, NextFunction } from 'express';
import { formatSuccess, paginationSchema, ValidationError } from '@fintap/shared';
import { leaveRequestService } from '../services/leave-request.service.js';

export class LeaveRequestController {
  /**
   * GET /leave-requests - List leave requests with pagination.
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pagination = paginationSchema.parse(req.query);
      const userId = (req as any).userId;
      const userRole = (req as any).userRole || 'user';

      const result = await leaveRequestService.list(pagination, userId, userRole);

      res.status(200).json({
        status: 'success',
        message: 'Leave requests retrieved successfully',
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /leave-requests - Create a new leave request.
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        throw new ValidationError('User ID is required', [
          { field: 'userId', message: 'x-user-id header is missing' },
        ]);
      }

      const requestId = req.headers['x-request-id'] as string | undefined;

      const payload = {
        type: req.body.type,
        reason: req.body.reason,
        startDate: req.body.startDate || req.body.start_date,
        endDate: req.body.endDate || req.body.end_date,
        photo: req.file ? ((req.file as any).location || `/uploads/${req.file.filename}`) : undefined,
      };

      const leaveRequest = await leaveRequestService.create(payload, userId, requestId);

      res.status(201).json(formatSuccess('Leave request created successfully', leaveRequest));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /leave-requests/:id - Get leave request by ID.
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid leave request ID',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const userId = (req as any).userId;
      const userRole = (req as any).userRole || 'user';

      const leaveRequest = await leaveRequestService.getById(id, userId, userRole);
      res.status(200).json(formatSuccess('Leave request retrieved successfully', leaveRequest));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /leave-requests/:id/approve - Approve a leave request (admin only).
   */
  async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid leave request ID',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const requestId = req.headers['x-request-id'] as string | undefined;
      const adminNote = req.body?.note;

      const leaveRequest = await leaveRequestService.approve(id, adminNote, requestId);
      res.status(200).json(formatSuccess('Leave request approved successfully', leaveRequest));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /leave-requests/:id/reject - Reject a leave request (admin only).
   */
  async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid leave request ID',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const requestId = req.headers['x-request-id'] as string | undefined;
      const adminNote = req.body?.note;

      const leaveRequest = await leaveRequestService.reject(id, adminNote, requestId);
      res.status(200).json(formatSuccess('Leave request rejected successfully', leaveRequest));
    } catch (error) {
      next(error);
    }
  }
}

export const leaveRequestController = new LeaveRequestController();
