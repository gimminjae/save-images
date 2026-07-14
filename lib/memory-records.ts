import type { MemoryRecord } from "@/types/memory";
import type { CategoryRecord } from "@/types/category";

export function normalizeMemoryRecord(
  id: string,
  record: Partial<MemoryRecord>,
): MemoryRecord | null {
  if (
    typeof record.name !== "string" ||
    typeof record.description !== "string" ||
    typeof record.imageUrl !== "string" ||
    typeof record.imageKey !== "string"
  ) {
    return null;
  }

  return {
    id,
    name: record.name,
    nickname:
      typeof record.nickname === "string" && record.nickname.trim().length > 0
        ? record.nickname
        : record.name,
    department:
      typeof record.department === "string" ? record.department : "",
    description: record.description,
    imageUrl: record.imageUrl,
    imageKey: record.imageKey,
    categoryId:
      typeof record.categoryId === "string" ? record.categoryId : null,
    category: isCategoryRecord(record.category) ? record.category : null,
    imageWidth:
      typeof record.imageWidth === "number" ? record.imageWidth : undefined,
    imageHeight:
      typeof record.imageHeight === "number" ? record.imageHeight : undefined,
    createdAt:
      typeof record.createdAt === "number" ? record.createdAt : Date.now(),
    updatedAt:
      typeof record.updatedAt === "number" ? record.updatedAt : Date.now(),
    status: record.status === "published" ? "published" : "published",
    isVisible: record.isVisible !== false,
    isCategoryFeatured: record.isCategoryFeatured === true,
    isMainFeatured: record.isMainFeatured === true,
    thumbnailUrl:
      typeof record.thumbnailUrl === "string" ? record.thumbnailUrl : undefined,
    eventId: typeof record.eventId === "string" ? record.eventId : undefined,
    authorId: typeof record.authorId === "string" ? record.authorId : undefined,
    isDeleted: record.isDeleted === true,
    sortOrder: typeof record.sortOrder === "number" ? record.sortOrder : null,
  };
}

function isCategoryRecord(value: unknown): value is CategoryRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const category = value as Partial<CategoryRecord>;

  return (
    typeof category.id === "string" &&
    typeof category.name === "string" &&
    typeof category.slug === "string" &&
    typeof category.path === "string"
  );
}

export function sortMemoriesByCreatedAtDesc(
  first: MemoryRecord,
  second: MemoryRecord,
) {
  return second.createdAt - first.createdAt;
}

export function isPublicMemory(memory: MemoryRecord) {
  return memory.status === "published" && !memory.isDeleted && memory.isVisible;
}

export function isManageableMemory(memory: MemoryRecord) {
  return memory.status === "published" && !memory.isDeleted;
}

export function getPublicMemoryDisplayName(
  memory: Pick<MemoryRecord, "name" | "nickname">,
) {
  return memory.nickname || memory.name;
}
