import { z } from 'zod';

const dateRegex = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

export const isoDateSchema = z.string().regex(dateRegex, 'Format tanggal harus YYYY-MM-DD');

export const dateRangeSchema = z.object({
  start_date: isoDateSchema,
  end_date: isoDateSchema,
}).refine(data => new Date(data.end_date) >= new Date(data.start_date), {
  message: 'end_date harus >= start_date',
  path: ['end_date'],
});

export const yearMonthSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});
