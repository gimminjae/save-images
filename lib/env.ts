const REQUIRED_SUPABASE_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

const REQUIRED_STORAGE_ENV_KEYS = [
  "NEXT_PUBLIC_AWS_REGION",
  "NEXT_PUBLIC_AWS_S3_BUCKET_NAME",
  "NEXT_PUBLIC_AWS_ACCESS_KEY_ID",
  "NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY",
] as const;

export type RequiredSupabaseEnvKey =
  (typeof REQUIRED_SUPABASE_ENV_KEYS)[number];
export type RequiredStorageEnvKey =
  (typeof REQUIRED_STORAGE_ENV_KEYS)[number];
export type RequiredServerEnvKey =
  | RequiredSupabaseEnvKey
  | RequiredStorageEnvKey;

const ENV_SNAPSHOT = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION,
  NEXT_PUBLIC_AWS_S3_BUCKET_NAME: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME,
  NEXT_PUBLIC_AWS_ACCESS_KEY_ID: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
  NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY:
    process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
  NEXT_PUBLIC_AWS_S3_PUBLIC_BASE_URL:
    process.env.NEXT_PUBLIC_AWS_S3_PUBLIC_BASE_URL,
} as const;

export type ServerEnv = {
  supabasePublishableKey: string;
  supabaseUrl: string;
  awsAccessKeyId: string;
  awsRegion: string;
  awsS3BucketName: string;
  awsS3PublicBaseUrl: string | null;
  awsSecretAccessKey: string;
};

function getMissingEnv<T extends readonly string[]>(keys: T) {
  return keys.filter((key) => {
    const value = ENV_SNAPSHOT[key as keyof typeof ENV_SNAPSHOT];

    return typeof value !== "string" || value.trim().length === 0;
  }) as T[number][];
}

export function getMissingSupabasePublicEnv(): RequiredSupabaseEnvKey[] {
  return getMissingEnv(REQUIRED_SUPABASE_ENV_KEYS);
}

export function getMissingStorageEnv(): RequiredStorageEnvKey[] {
  return getMissingEnv(REQUIRED_STORAGE_ENV_KEYS);
}

export function getMissingServerEnv(): RequiredServerEnvKey[] {
  return Array.from(
    new Set([
      ...getMissingSupabasePublicEnv(),
      ...getMissingStorageEnv(),
    ]),
  ) as RequiredServerEnvKey[];
}

export function getSupabasePublicEnv() {
  const missingEnvVars = getMissingSupabasePublicEnv();

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(", ")}`,
    );
  }

  return {
    supabasePublishableKey:
      ENV_SNAPSHOT.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!.trim(),
    supabaseUrl: ENV_SNAPSHOT.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  };
}

export function getStorageEnv() {
  const missingEnvVars = getMissingStorageEnv();

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(", ")}`,
    );
  }

  return {
    awsAccessKeyId: ENV_SNAPSHOT.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!.trim(),
    awsRegion: ENV_SNAPSHOT.NEXT_PUBLIC_AWS_REGION!.trim(),
    awsS3BucketName: ENV_SNAPSHOT.NEXT_PUBLIC_AWS_S3_BUCKET_NAME!.trim(),
    awsS3PublicBaseUrl:
      ENV_SNAPSHOT.NEXT_PUBLIC_AWS_S3_PUBLIC_BASE_URL?.trim() || null,
    awsSecretAccessKey:
      ENV_SNAPSHOT.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!.trim(),
  };
}

export function getServerEnv(): ServerEnv {
  return {
    ...getSupabasePublicEnv(),
    ...getStorageEnv(),
  };
}
