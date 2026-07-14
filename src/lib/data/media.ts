import sharp from "sharp";

import {
  buildDerivedKey,
  createSignedDownloadUrl,
  deleteObjects,
  getPublicAssetUrl,
  readObjectBytes,
  writeDerivedObject,
} from "@/lib/aws/s3";
import { demoMedia } from "@/lib/demo";
import { env, isRuntimeConfigured, isSupabaseConfigured } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { inferMediaType } from "@/lib/utils";
import type { MediaItem, MediaStatus, UploadSessionStatus } from "@/types/domain";

function mapMedia(row: Record<string, unknown>): MediaItem {
  return {
    id: String(row.id),
    eventSlug: String(row.event_slug),
    categoryId: String(row.category_id),
    mediaType: row.media_type === "video" ? "video" : "image",
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    originalFilename: String(row.original_filename),
    originalExtension: String(row.original_extension),
    mimeType: String(row.mime_type),
    fileSize: Number(row.file_size ?? 0),
    checksum: row.checksum ? String(row.checksum) : null,
    width: row.width ? Number(row.width) : null,
    height: row.height ? Number(row.height) : null,
    durationSeconds: row.duration_seconds ? Number(row.duration_seconds) : null,
    originalS3Key: row.original_s3_key ? String(row.original_s3_key) : null,
    previewS3Key: row.preview_s3_key ? String(row.preview_s3_key) : null,
    thumbnailS3Key: row.thumbnail_s3_key ? String(row.thumbnail_s3_key) : null,
    posterS3Key: row.poster_s3_key ? String(row.poster_s3_key) : null,
    status: String(row.status) as MediaStatus,
    uploadSessionId: row.upload_session_id ? String(row.upload_session_id) : null,
    capturedAt: row.captured_at ? String(row.captured_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  };
}

export async function listMedia({
  eventSlug = env.DEFAULT_EVENT_SLUG,
  categoryId,
  mediaType,
  limit = 24,
  page = 1,
  sort = "latest",
}: {
  eventSlug?: string;
  categoryId?: string;
  mediaType?: "image" | "video";
  limit?: number;
  page?: number;
  sort?: "latest" | "oldest" | "name";
}) {
  if (!isSupabaseConfigured()) {
    return demoMedia
      .filter((item) => item.eventSlug === eventSlug)
      .filter((item) => (categoryId ? item.categoryId === categoryId : true))
      .filter((item) => (mediaType ? item.mediaType === mediaType : true))
      .slice(0, limit);
  }

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("media")
    .select("*")
    .eq("event_slug", eventSlug)
    .eq("status", "ready")
    .is("deleted_at", null)
    .range((page - 1) * limit, page * limit - 1);

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (mediaType) {
    query = query.eq("media_type", mediaType);
  }

  if (sort === "name") {
    query = query.order("title", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: sort === "oldest" });
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapMedia(row as Record<string, unknown>));
}

export async function getRecentMedia({ limit = 6 }: { limit?: number }) {
  return listMedia({ limit, sort: "latest" });
}

export async function getMediaById(id: string) {
  if (!isSupabaseConfigured()) {
    return demoMedia.find((item) => item.id === id) ?? null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("media")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapMedia(data as Record<string, unknown>) : null;
}

export function getDisplayAssetUrl(item: MediaItem) {
  const preferredKey =
    item.mediaType === "video" ? item.posterS3Key : item.thumbnailS3Key ?? item.previewS3Key;

  return getPublicAssetUrl(preferredKey);
}

export async function createUploadSession(params: {
  eventSlug: string;
  categoryId: string;
  totalFiles: number;
  status?: UploadSessionStatus;
}) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("upload_sessions")
    .insert({
      event_slug: params.eventSlug,
      category_id: params.categoryId,
      total_files: params.totalFiles,
      completed_files: 0,
      failed_files: 0,
      status: params.status ?? "uploading",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as { id: string };
}

export async function createPendingMediaRecords(
  records: Array<{
    id: string;
    eventSlug: string;
    categoryId: string;
    mediaType: "image" | "video";
    title: string;
    originalFilename: string;
    originalExtension: string;
    mimeType: string;
    fileSize: number;
    originalS3Key: string;
    uploadSessionId: string;
  }>,
) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("media").insert(
    records.map((record) => ({
      id: record.id,
      event_slug: record.eventSlug,
      category_id: record.categoryId,
      media_type: record.mediaType,
      title: record.title,
      description: null,
      original_filename: record.originalFilename,
      original_extension: record.originalExtension,
      mime_type: record.mimeType,
      file_size: record.fileSize,
      checksum: null,
      width: null,
      height: null,
      duration_seconds: null,
      original_s3_key: record.originalS3Key,
      preview_s3_key: null,
      thumbnail_s3_key: null,
      poster_s3_key: null,
      status: "uploading",
      upload_session_id: record.uploadSessionId,
      captured_at: null,
      deleted_at: null,
    })),
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function finalizeUploadSession(params: {
  uploadSessionId: string;
  files: Array<{
    mediaId: string;
    success: boolean;
    width?: number | null;
    height?: number | null;
    durationSeconds?: number | null;
    error?: string | null;
  }>;
}) {
  const supabase = getSupabaseAdmin();
  const completed = params.files.filter((item) => item.success).length;
  const failed = params.files.filter((item) => !item.success).length;

  for (const file of params.files) {
    const media = await getMediaById(file.mediaId);
    if (!media) {
      continue;
    }

    let previewS3Key = media.previewS3Key;
    let thumbnailS3Key = media.thumbnailS3Key;

    if (file.success && media.mediaType === "image" && isRuntimeConfigured() && media.originalS3Key) {
      const originalBytes = await readObjectBytes(media.originalS3Key);
      const previewKey = buildDerivedKey({
        eventSlug: media.eventSlug,
        mediaType: "image",
        mediaId: media.id,
        variant: "previews",
        extension: "webp",
      });
      const thumbKey = buildDerivedKey({
        eventSlug: media.eventSlug,
        mediaType: "image",
        mediaId: media.id,
        variant: "thumbs",
        extension: "webp",
      });

      const previewBuffer = await sharp(originalBytes)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 84 })
        .toBuffer();

      const thumbBuffer = await sharp(originalBytes)
        .rotate()
        .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer();

      await writeDerivedObject({
        key: previewKey,
        body: previewBuffer,
        contentType: "image/webp",
      });
      await writeDerivedObject({
        key: thumbKey,
        body: thumbBuffer,
        contentType: "image/webp",
      });

      previewS3Key = previewKey;
      thumbnailS3Key = thumbKey;
    }

    const { error } = await supabase
      .from("media")
      .update({
        width: file.width ?? media.width,
        height: file.height ?? media.height,
        duration_seconds: file.durationSeconds ?? media.durationSeconds,
        preview_s3_key: previewS3Key,
        thumbnail_s3_key: thumbnailS3Key,
        status: file.success ? "ready" : "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", file.mediaId);

    if (error) {
      throw new Error(error.message);
    }
  }

  const { error } = await supabase
    .from("upload_sessions")
    .update({
      completed_files: completed,
      failed_files: failed,
      status: failed ? (completed ? "completed" : "failed") : "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", params.uploadSessionId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function cancelUploadSession(uploadSessionId: string) {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("upload_sessions")
    .update({
      status: "cancelled",
      completed_at: new Date().toISOString(),
    })
    .eq("id", uploadSessionId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateMedia(
  id: string,
  updates: {
    title?: string;
    description?: string | null;
    categoryId?: string;
  },
) {
  const supabase = getSupabaseAdmin();
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) {
    payload.title = updates.title;
  }
  if (updates.description !== undefined) {
    payload.description = updates.description;
  }
  if (updates.categoryId !== undefined) {
    payload.category_id = updates.categoryId;
  }

  const { data, error } = await supabase
    .from("media")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapMedia(data as Record<string, unknown>);
}

export async function softDeleteMedia(id: string) {
  const media = await getMediaById(id);
  if (!media) {
    throw new Error("Media not found.");
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("media")
    .update({
      status: "deleted",
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  if (isRuntimeConfigured()) {
    await deleteObjects(
      [
        media.originalS3Key,
        media.previewS3Key,
        media.thumbnailS3Key,
        media.posterS3Key,
      ].filter((value): value is string => Boolean(value)),
    );
  }

  return { success: true };
}

export async function createDownloadLink(mediaId: string) {
  const media = await getMediaById(mediaId);
  if (!media?.originalS3Key) {
    throw new Error("Original file is not available.");
  }

  return createSignedDownloadUrl({
    key: media.originalS3Key,
    fileName: media.originalFilename,
  });
}

export function buildMediaTitle(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

export function deriveMediaTypeFromMime(mimeType: string) {
  return inferMediaType(mimeType);
}
