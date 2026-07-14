import { z } from "zod";

export const mediaListSchema = z.object({
  categoryId: z.string().optional(),
  mediaType: z.enum(["image", "video"]).optional(),
  limit: z.coerce.number().int().min(1).max(60).default(24),
  page: z.coerce.number().int().min(1).default(1),
  sort: z.enum(["latest", "oldest", "name"]).default("latest"),
});

export const mediaUpdateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  categoryId: z.string().optional(),
});
