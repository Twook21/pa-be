import { z } from 'zod';
import type { PaginationParams } from '../types/common';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(100).catch(10),
}) as z.ZodType<PaginationParams>;

export type PaginationInput = PaginationParams;
