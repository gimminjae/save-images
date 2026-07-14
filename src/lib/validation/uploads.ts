import { z } from "zod";

export const presignFileSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1).max(255),
  size: z.number().int().positive(),
  type: z.string().min(1),
});

export const presignUploadSchema = z.object({
  eventSlug: z.string().min(1).optional(),
  categoryId: z.string().min(1),
  files: z.array(presignFileSchema).min(1).max(30),
});

export const completeUploadSchema = z.object({
  uploadSessionId: z.string().min(1),
  files: z
    .array(
      z.object({
        mediaId: z.string().min(1),
        clientId: z.string().min(1),
        success: z.boolean(),
        width: z.number().int().positive().nullable().optional(),
        height: z.number().int().positive().nullable().optional(),
        durationSeconds: z.number().positive().nullable().optional(),
        error: z.string().nullable().optional(),
      }),
    )
    .min(1),
});

export const cancelUploadSchema = z.object({
  uploadSessionId: z.string().min(1),
});
