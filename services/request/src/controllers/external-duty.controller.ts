import { Request, Response, NextFunction } from 'express';
import { formatSuccess, paginationSchema, ValidationError } from '@fintap/shared';
import { externalDutyService } from '../services/external-duty.service.js';

export class ExternalDutyController {
  /**
   * GET /external-duties - List external duties with pagination.
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pagination = paginationSchema.parse(req.query);
      const userId = (req as any).userId;
      const userRole = (req as any).userRole || 'user';

      const result = await externalDutyService.list(pagination, userId, userRole);

      res.status(200).json({
        status: 'success',
        message: 'External duties retrieved successfully',
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /external-duties - Create a new external duty request.
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
        date: req.body.date,
        location: req.body.location,
        description: req.body.description,
        document: req.file ? ((req.file as any).location || `/uploads/${req.file.filename}`) : undefined,
      };

      const duty = await externalDutyService.create(payload, userId, requestId);

      res.status(201).json(formatSuccess('External duty created successfully', duty));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /external-duties/:id - Get external duty by ID.
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid external duty ID',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const userId = (req as any).userId;
      const userRole = (req as any).userRole || 'user';

      const duty = await externalDutyService.getById(id, userId, userRole);
      res.status(200).json(formatSuccess('External duty retrieved successfully', duty));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /external-duties/:id/approve - Approve an external duty (admin only).
   */
  async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid external duty ID',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const adminId = (req as any).userId;
      const requestId = req.headers['x-request-id'] as string | undefined;
      const adminNotes = req.body?.note;

      const duty = await externalDutyService.approve(id, adminId, adminNotes, requestId);
      res.status(200).json(formatSuccess('External duty approved successfully', duty));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /external-duties/:id/reject - Reject an external duty (admin only).
   */
  async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid external duty ID',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const adminId = (req as any).userId;
      const requestId = req.headers['x-request-id'] as string | undefined;
      const adminNotes = req.body?.note;

      const duty = await externalDutyService.reject(id, adminId, adminNotes, requestId);
      res.status(200).json(formatSuccess('External duty rejected successfully', duty));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /external-duties/:id/process - Process (approve/reject) an external duty (admin only).
   */
  async process(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid external duty ID',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const { status, note } = req.body;
      if (!status || (status !== 'approved' && status !== 'rejected')) {
        res.status(400).json({
          status: 'error',
          message: 'Status must be approved or rejected',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const adminId = (req as any).userId;
      const requestId = req.headers['x-request-id'] as string | undefined;

      let duty;
      if (status === 'approved') {
        duty = await externalDutyService.approve(id, adminId, note, requestId);
      } else {
        duty = await externalDutyService.reject(id, adminId, note, requestId);
      }

      res.status(200).json(formatSuccess(`External duty ${status} successfully`, duty));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /internal/external-duties/by-user-date - Get approved external duty by user and date.
   * Internal endpoint used by Attendance Service.
   */
  async getByUserAndDate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = parseInt(req.query.user_id as string, 10);
      const date = req.query.date as string;

      if (isNaN(userId) || !date) {
        res.status(400).json({
          status: 'error',
          message: 'user_id and date query parameters are required',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const duty = await externalDutyService.getByUserAndDate(userId, date);

      res.status(200).json(formatSuccess(
        duty ? 'External duty found' : 'No approved external duty for this user/date',
        duty
      ));
    } catch (error) {
      next(error);
    }
  }
}

export const externalDutyController = new ExternalDutyController();
