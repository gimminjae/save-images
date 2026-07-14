import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  DEFAULT_EVENT_SLUG: z.string().min(1).default("16th-hanmong-retreat"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  AWS_REGION: z.string().min(1).optional(),
  AWS_S3_BUCKET_NAME: z.string().min(1).optional(),
  AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  AWS_PUBLIC_BASE_URL: z.string().url().optional(),
  UPLOAD_ACCESS_PASSWORD: z.string().min(4).optional(),
  MANAGE_ACCESS_PASSWORD: z.string().min(4).optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  DEFAULT_EVENT_SLUG: process.env.DEFAULT_EVENT_SLUG,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  AWS_REGION: process.env.AWS_REGION,
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_PUBLIC_BASE_URL: process.env.AWS_PUBLIC_BASE_URL,
  UPLOAD_ACCESS_PASSWORD: process.env.UPLOAD_ACCESS_PASSWORD,
  MANAGE_ACCESS_PASSWORD: process.env.MANAGE_ACCESS_PASSWORD,
});

export function isSupabaseConfigured() {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isS3Configured() {
  return Boolean(
    env.AWS_REGION &&
      env.AWS_S3_BUCKET_NAME &&
      env.AWS_ACCESS_KEY_ID &&
      env.AWS_SECRET_ACCESS_KEY,
  );
}

export function isRuntimeConfigured() {
  return isSupabaseConfigured() && isS3Configured();
}
