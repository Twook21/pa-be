import { Request, Response, NextFunction } from 'express';
import { formatSuccess, ValidationError } from '@fintap/shared';
import { userLocationService } from '../services/user-location.service.js';

export class UserLocationController {
  /**
   * PUT /user-locations - Update the authenticated user's location.
   */
  async updateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        throw new ValidationError('User ID required', [
          { field: 'x-user-id', message: 'User ID header is missing' },
        ]);
      }

      const { latitude, longitude } = req.body;

      if (latitude === undefined || longitude === undefined) {
        throw new ValidationError('Coordinates required', [
          ...(!latitude && latitude !== 0 ? [{ field: 'latitude', message: 'Latitude is required' }] : []),
          ...(!longitude && longitude !== 0 ? [{ field: 'longitude', message: 'Longitude is required' }] : []),
        ]);
      }

      if (latitude < -90 || latitude > 90) {
        throw new ValidationError('Invalid latitude', [
          { field: 'latitude', message: 'Latitude must be between -90 and 90' },
        ]);
      }

      if (longitude < -180 || longitude > 180) {
        throw new ValidationError('Invalid longitude', [
          { field: 'longitude', message: 'Longitude must be between -180 and 180' },
        ]);
      }

      const location = await userLocationService.updateLocation(userId, latitude, longitude);
      res.status(200).json(formatSuccess('Location updated successfully', location));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /user-locations - Get all user locations (admin only).
   */
  async getAllLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const locations = await userLocationService.getAllLocations();
      res.status(200).json(formatSuccess('User locations retrieved successfully', locations));
    } catch (error) {
      next(error);
    }
  }
}

export const userLocationController = new UserLocationController();
