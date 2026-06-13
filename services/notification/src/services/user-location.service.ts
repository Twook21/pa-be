import { PrismaClient } from '../db.js';

const prisma = new PrismaClient();

export class UserLocationService {
  /**
   * Update or create a user's location (upsert).
   */
  async updateLocation(userId: number, latitude: number, longitude: number) {
    const location = await prisma.userLocation.upsert({
      where: { userId },
      update: {
        latitude,
        longitude,
      },
      create: {
        userId,
        latitude,
        longitude,
      },
    });

    return this.formatLocation(location);
  }

  /**
   * Get all user locations (admin only).
   */
  async getAllLocations() {
    const locations = await prisma.userLocation.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    return locations.map(this.formatLocation);
  }

  /**
   * Format Prisma UserLocation to response DTO.
   */
  private formatLocation(location: any) {
    return {
      id: location.id,
      userId: location.userId,
      latitude: parseFloat(location.latitude.toString()),
      longitude: parseFloat(location.longitude.toString()),
      updatedAt: location.updatedAt instanceof Date
        ? location.updatedAt.toISOString()
        : location.updatedAt,
    };
  }
}

export const userLocationService = new UserLocationService();
