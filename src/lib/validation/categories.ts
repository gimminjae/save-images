import { z } from "zod";

export const categoryCreateSchema = z.object({
  eventSlug: z.string().min(1).optional(),
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(80),
  description: z.string().max(300).nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export const categoryUpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(300).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});
