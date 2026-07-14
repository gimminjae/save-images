import { randomUUID } from "node:crypto";

import { createSignedUploadUrl, buildOriginalKey } from "@/lib/aws/s3";
import { getCategoryTree } from "@/lib/data/categories";
import {
  buildMediaTitle,
  createPendingMediaRecords,
  createUploadSession,
  deriveMediaTypeFromMime,
} from "@/lib/data/media";
import { env, isRuntimeConfigured } from "@/lib/env";
import { fail, ok } from "@/lib/http";
import { presignUploadSchema } from "@/lib/validation/uploads";
import { normalizeExtension } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isRuntimeConfigured()) {
    return fail("Supabase 또는 AWS S3 환경 변수가 아직 설정되지 않았습니다.", 503);
  }

  try {
    const payload = presignUploadSchema.parse(await request.json());
    const eventSlug = payload.eventSlug ?? env.DEFAULT_EVENT_SLUG;
    const categories = await getCategoryTree(eventSlug);
    const category = categories.find((item) => item.id === payload.categoryId);

    if (!category) {
      return fail("대상 카테고리를 찾을 수 없습니다.", 404);
    }

    const uploadSession = await createUploadSession({
      eventSlug,
      categoryId: category.id,
      totalFiles: payload.files.length,
    });

    const preparedFiles = await Promise.all(
      payload.files.map(async (file) => {
        const mediaId = randomUUID();
        const extension = normalizeExtension(file.name, file.type);
        const mediaType = deriveMediaTypeFromMime(file.type);
        const originalS3Key = buildOriginalKey({
          eventSlug,
          mediaType,
          mediaId,
          extension,
        });
        const signed = await createSignedUploadUrl({
          key: originalS3Key,
          contentType: file.type,
        });

        return {
          clientId: file.clientId,
          mediaId,
          mediaType,
          originalS3Key,
          originalFilename: file.name,
          originalExtension: extension,
          title: buildMediaTitle(file.name),
          fileSize: file.size,
          mimeType: file.type,
          uploadUrl: signed.uploadUrl,
          headers: signed.headers,
        };
      }),
    );

    await createPendingMediaRecords(
      preparedFiles.map((file) => ({
        id: file.mediaId,
        eventSlug,
        categoryId: category.id,
        mediaType: file.mediaType,
        title: file.title,
        originalFilename: file.originalFilename,
        originalExtension: file.originalExtension,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        originalS3Key: file.originalS3Key,
        uploadSessionId: uploadSession.id,
      })),
    );

    return ok({
      uploadSessionId: uploadSession.id,
      files: preparedFiles.map((file) => ({
        clientId: file.clientId,
        mediaId: file.mediaId,
        uploadUrl: file.uploadUrl,
        headers: file.headers,
      })),
    });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "업로드 URL을 만들지 못했습니다.",
      400,
    );
  }
}
