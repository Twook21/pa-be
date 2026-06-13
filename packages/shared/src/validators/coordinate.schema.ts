import { z } from 'zod';

export const latitudeSchema = z.number().min(-90).max(90);
export const longitudeSchema = z.number().min(-180).max(180);
export const coordinateSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
});

export type Coordinate = z.infer<typeof coordinateSchema>;
