import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env, isS3Configured } from "@/lib/env";
import type { MediaType } from "@/types/domain";

let s3Client: S3Client | null = null;

function getS3Client() {
  if (!isS3Configured()) {
    throw new Error("AWS S3 is not configured.");
  }

  if (!s3Client) {
    s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  return s3Client;
}

function getBucket() {
  if (!env.AWS_S3_BUCKET_NAME) {
    throw new Error("AWS_S3_BUCKET_NAME is missing.");
  }

  return env.AWS_S3_BUCKET_NAME;
}

export function buildOriginalKey({
  eventSlug,
  mediaType,
  mediaId,
  extension,
  now = new Date(),
}: {
  eventSlug: string;
  mediaType: MediaType;
  mediaId: string;
  extension: string;
  now?: Date;
}) {
  const year = `${now.getUTCFullYear()}`;
  const month = `${now.getUTCMonth() + 1}`.padStart(2, "0");
  const directory = mediaType === "video" ? "videos" : "images";
  return `events/${eventSlug}/originals/${directory}/${year}/${month}/${mediaId}.${extension}`;
}

export function buildDerivedKey({
  eventSlug,
  mediaType,
  mediaId,
  variant,
  extension,
  now = new Date(),
}: {
  eventSlug: string;
  mediaType: MediaType;
  mediaId: string;
  variant: "thumbs" | "previews" | "posters";
  extension: string;
  now?: Date;
}) {
  const year = `${now.getUTCFullYear()}`;
  const month = `${now.getUTCMonth() + 1}`.padStart(2, "0");
  const folder =
    mediaType === "video"
      ? `videos/${variant}`
      : `images/${variant}`;

  return `events/${eventSlug}/derived/${folder}/${year}/${month}/${mediaId}.${extension}`;
}

export async function createSignedUploadUrl({
  key,
  contentType,
}: {
  key: string;
  contentType: string;
}) {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
    CacheControl: "private, max-age=0, no-store",
  });

  const uploadUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: 300,
  });

  return {
    uploadUrl,
    headers: {
      "Content-Type": contentType,
    },
  };
}

export async function createSignedDownloadUrl({
  key,
  fileName,
}: {
  key: string;
  fileName: string;
}) {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  });

  return getSignedUrl(getS3Client(), command, {
    expiresIn: 120,
  });
}

export async function readObjectBytes(key: string) {
  const response = await getS3Client().send(
    new GetObjectCommand({
      Bucket: getBucket(),
      Key: key,
    }),
  );

  if (!response.Body) {
    throw new Error(`S3 object body is empty for key: ${key}`);
  }

  return response.Body.transformToByteArray();
}

export async function writeDerivedObject({
  key,
  body,
  contentType,
}: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}) {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

export async function deleteObjects(keys: string[]) {
  const filtered = keys.filter(Boolean);
  if (!filtered.length) {
    return;
  }

  await getS3Client().send(
    new DeleteObjectsCommand({
      Bucket: getBucket(),
      Delete: {
        Objects: filtered.map((Key) => ({ Key })),
      },
    }),
  );
}

export function getPublicAssetUrl(key: string | null) {
  if (!key) {
    return null;
  }

  if (env.AWS_PUBLIC_BASE_URL) {
    return `${env.AWS_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
  }

  if (!env.AWS_REGION || !env.AWS_S3_BUCKET_NAME) {
    return null;
  }

  return env.AWS_REGION === "us-east-1"
    ? `https://${env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${key}`
    : `https://${env.AWS_S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}
