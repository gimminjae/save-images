import type { CategoryRecord } from "@/types/category";

export type MemoryRecord = {
  id: string;
  name: string;
  nickname: string;
  department: string;
  description: string;
  imageUrl: string;
  imageKey: string;
  categoryId: string | null;
  category: CategoryRecord | null;
  imageWidth?: number;
  imageHeight?: number;
  createdAt: number;
  updatedAt: number;
  status: "published";
  isVisible: boolean;
  isCategoryFeatured: boolean;
  isMainFeatured: boolean;
  thumbnailUrl?: string;
  eventId?: string;
  authorId?: string;
  isDeleted?: boolean;
  sortOrder?: number | null;
  downloadUrl?: string;
};

export type CreateMemoryInput = {
  name: string;
  nickname?: string;
  department?: string;
  description?: string;
  imageUrl: string;
  imageKey: string;
  categoryId: string;
  imageWidth?: number;
  imageHeight?: number;
  isVisible?: boolean;
  isCategoryFeatured?: boolean;
  isMainFeatured?: boolean;
};

export type UpdateMemoryInput = {
  name: string;
  nickname?: string;
  department?: string;
  description?: string;
  categoryId: string;
  isVisible: boolean;
  isCategoryFeatured: boolean;
  isMainFeatured: boolean;
  imageUrl?: string;
  imageKey?: string;
  imageWidth?: number;
  imageHeight?: number;
};
