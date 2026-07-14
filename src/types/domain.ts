export type MediaType = "image" | "video";

export type MediaStatus =
  | "pending"
  | "uploading"
  | "processing"
  | "ready"
  | "failed"
  | "deleted";

export type UploadSessionStatus =
  | "pending"
  | "uploading"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface CategoryNode {
  id: string;
  eventSlug: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  coverMediaId: string | null;
  sortOrder: number;
  depth: number;
  path: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  id: string;
  eventSlug: string;
  categoryId: string;
  mediaType: MediaType;
  title: string;
  description: string | null;
  originalFilename: string;
  originalExtension: string;
  mimeType: string;
  fileSize: number;
  checksum: string | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  originalS3Key: string | null;
  previewS3Key: string | null;
  thumbnailS3Key: string | null;
  posterS3Key: string | null;
  status: MediaStatus;
  uploadSessionId: string | null;
  capturedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
