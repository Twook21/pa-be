import { PrismaClient } from '../db.js';
import { NotFoundError, ValidationError } from '@fintap/shared';

const prisma = new PrismaClient();

export interface CreateLocationDTO {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export interface UpdateLocationDTO {
  name?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  isActive?: boolean;
}

export class LocationService {
  /**
   * List all locations.
   */
  async list() {
    const locations = await prisma.location.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return locations.map(this.formatLocation);
  }

  /**
   * Create a new location (admin only).
   */
  async create(data: CreateLocationDTO) {
    const errors: Array<{ field: string; message: string }> = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Name is required' });
    }
    if (data.latitude === undefined || data.latitude < -90 || data.latitude > 90) {
      errors.push({ field: 'latitude', message: 'Latitude must be between -90 and 90' });
    }
    if (data.longitude === undefined || data.longitude < -180 || data.longitude > 180) {
      errors.push({ field: 'longitude', message: 'Longitude must be between -180 and 180' });
    }
    if (data.radius === undefined || data.radius <= 0) {
      errors.push({ field: 'radius', message: 'Radius must be a positive number' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid location data', errors);
    }

    const location = await prisma.location.create({
      data: {
        name: data.name.trim(),
        latitude: data.latitude,
        longitude: data.longitude,
        radius: data.radius,
      },
    });

    return this.formatLocation(location);
  }

  /**
   * Update a location (admin only).
   */
  async update(id: number, data: UpdateLocationDTO) {
    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Location not found');
    }

    const errors: Array<{ field: string; message: string }> = [];

    if (data.latitude !== undefined && (data.latitude < -90 || data.latitude > 90)) {
      errors.push({ field: 'latitude', message: 'Latitude must be between -90 and 90' });
    }
    if (data.longitude !== undefined && (data.longitude < -180 || data.longitude > 180)) {
      errors.push({ field: 'longitude', message: 'Longitude must be between -180 and 180' });
    }
    if (data.radius !== undefined && data.radius <= 0) {
      errors.push({ field: 'radius', message: 'Radius must be a positive number' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid location data', errors);
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.radius !== undefined) updateData.radius = data.radius;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const location = await prisma.location.update({
      where: { id },
      data: updateData,
    });

    return this.formatLocation(location);
  }

  /**
   * Get the current active location (internal endpoint).
   */
  async getCurrentLocation() {
    const location = await prisma.location.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!location) {
      throw new NotFoundError('No active location found');
    }

    return this.formatLocation(location);
  }

  /**
   * Format a Prisma Location model to the LocationDTO response format.
   */
  private formatLocation(location: any) {
    return {
      id: location.id,
      name: location.name,
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      radius: location.radius,
      isActive: location.isActive,
      createdAt: location.createdAt instanceof Date
        ? location.createdAt.toISOString()
        : location.createdAt,
      updatedAt: location.updatedAt instanceof Date
        ? location.updatedAt.toISOString()
        : location.updatedAt,
    };
  }
}

export const locationService = new LocationService();
