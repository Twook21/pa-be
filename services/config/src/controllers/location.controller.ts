import { Request, Response, NextFunction } from 'express';
import { formatSuccess } from '@fintap/shared';
import { locationService } from '../services/location.service.js';

export class LocationController {
  /**
   * GET / - List all locations.
   */
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const locations = await locationService.list();
      res.status(200).json(formatSuccess('Locations retrieved successfully', locations));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST / - Create a new location (admin only).
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const location = await locationService.create(req.body);
      res.status(201).json(formatSuccess('Location created successfully', location));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /:id - Update a location (admin only).
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid location ID',
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      const location = await locationService.update(id, req.body);
      res.status(200).json(formatSuccess('Location updated successfully', location));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /internal/locations/current - Get current active location (internal).
   */
  async getCurrent(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const location = await locationService.getCurrentLocation();
      res.status(200).json(formatSuccess('Current location retrieved', location));
    } catch (error) {
      next(error);
    }
  }
}

export const locationController = new LocationController();
