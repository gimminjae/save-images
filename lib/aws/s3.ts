import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import path from "node:path";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getStorageEnv } from "@/lib/env";
import { MEMORY_OBJECT_ROOT } from "@/lib/memories/shared";

let s3Client: S3Client | null = null;
const MEMORY_CACHE_CONTROL = "public, max-age=31536000, immutable";
const DIRECT_UPLOAD_EXPIRATION_SECONDS = 60 * 10;

type UploadTokenPayload = {
  contentType: string;
  expiresAt: number;
  fileKey: string;
  fileSize: number;
};

function getS3Client() {
  if (s3Client) {
    return s3Client;
  }

  const env = getStorageEnv();

  s3Client = new S3Client({
    region: env.awsRegion,
    credentials: {
      accessKeyId: env.awsAccessKeyId,
      secretAccessKey: env.awsSecretAccessKey,
    },
  });

  return s3Client;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function createUploadTokenSignature(encodedPayload: string) {
  return createHmac("sha256", getStorageEnv().awsSecretAccessKey)
    .update(encodedPayload)
    .digest("base64url");
}

function sanitizeFileStem(fileName: string) {
  const stem = path.basename(fileName, path.extname(fileName)).normalize("NFKD");

  return stem
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60) || "image";
}

export function createMemoryObjectKey(extension: string, fileName: string) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const datePath = `${year}-${month}-${day}`;
  const fileStem = sanitizeFileStem(fileName);
  const suffix = randomUUID().slice(0, 8);

  return `${MEMORY_OBJECT_ROOT}/${datePath}/${fileStem}-${suffix}.${extension}`;
}

export function getPublicAssetUrl(fileKey: string) {
  const env = getStorageEnv();

  if (env.awsS3PublicBaseUrl) {
    return `${trimTrailingSlash(env.awsS3PublicBaseUrl)}/${fileKey}`;
  }

  if (env.awsRegion === "us-east-1") {
    return `https://${env.awsS3BucketName}.s3.amazonaws.com/${fileKey}`;
  }

  return `https://${env.awsS3BucketName}.s3.${env.awsRegion}.amazonaws.com/${fileKey}`;
}

export async function createPresignedMemoryUpload(params: {
  contentType: string;
  fileKey: string;
  fileSize: number;
}) {
  const env = getStorageEnv();
  const expiresAt = Date.now() + DIRECT_UPLOAD_EXPIRATION_SECONDS * 1000;
  const command = new PutObjectCommand({
    Bucket: env.awsS3BucketName,
    Key: params.fileKey,
    ContentType: params.contentType,
    CacheControl: MEMORY_CACHE_CONTROL,
  });
  const uploadUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: DIRECT_UPLOAD_EXPIRATION_SECONDS,
  });
  const uploadToken = createUploadToken({
    contentType: params.contentType,
    expiresAt,
    fileKey: params.fileKey,
    fileSize: params.fileSize,
  });

  return {
    expiresAt,
    fileKey: params.fileKey,
    headers: {
      "Cache-Control": MEMORY_CACHE_CONTROL,
      "Content-Type": params.contentType,
    },
    publicUrl: getPublicAssetUrl(params.fileKey),
    uploadToken,
    uploadUrl,
  };
}

export function createUploadToken(payload: UploadTokenPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const signature = createUploadTokenSignature(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyUploadToken(token: string) {
  const [encodedPayload, signature, ...rest] = token.split(".");

  if (!encodedPayload || !signature || rest.length > 0) {
    throw new Error("업로드 인증 정보가 올바르지 않아요.");
  }

  const expectedSignature = createUploadTokenSignature(encodedPayload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error("업로드 인증 정보가 올바르지 않아요.");
  }

  const payload = JSON.parse(
    Buffer.from(encodedPayload, "base64url").toString("utf8"),
  ) as Partial<UploadTokenPayload>;

  if (
    typeof payload.fileKey !== "string" ||
    typeof payload.contentType !== "string" ||
    typeof payload.fileSize !== "number" ||
    typeof payload.expiresAt !== "number"
  ) {
    throw new Error("업로드 인증 정보가 손상되었어요.");
  }

  if (payload.expiresAt < Date.now()) {
    throw new Error("업로드 인증 시간이 만료되었어요. 다시 시도해 주세요.");
  }

  return payload as UploadTokenPayload;
}

export async function uploadMemoryObject(params: {
  body: Uint8Array;
  contentType: string;
  fileKey: string;
}) {
  const env = getStorageEnv();

  const command = new PutObjectCommand({
    Bucket: env.awsS3BucketName,
    Key: params.fileKey,
    Body: params.body,
    ContentType: params.contentType,
    CacheControl: MEMORY_CACHE_CONTROL,
  });

  await getS3Client().send(command);

  return {
    publicUrl: getPublicAssetUrl(params.fileKey),
  };
}

export async function deleteMemoryObject(fileKey: string) {
  const env = getStorageEnv();

  const command = new DeleteObjectCommand({
    Bucket: env.awsS3BucketName,
    Key: fileKey,
  });

  await getS3Client().send(command);
}
