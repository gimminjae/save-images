import "server-only";

import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getStorageEnv } from "@/lib/env";
import { MEMORY_OBJECT_ROOT } from "@/lib/memories/shared";

let s3Client: S3Client | null = null;

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

function sanitizeFileStem(fileName: string) {
  const stem = path.basename(fileName, path.extname(fileName)).normalize("NFC");

  return stem
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
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
    CacheControl: "public, max-age=31536000, immutable",
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
