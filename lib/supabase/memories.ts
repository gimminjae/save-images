import "server-only";

import type {
  CreateMemoryInput,
  MemoryRecord,
  UpdateMemoryInput,
} from "@/types/memory";
import type { CategoryRecord } from "@/types/category";
import { getSupabasePublic } from "@/lib/supabase/server";

type MemoryRow = Record<string, unknown>;
type CategoryRow = Record<string, unknown>;

function toTimestamp(value: unknown) {
  if (typeof value !== "string") {
    return Date.now();
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function mapMemoryRow(row: MemoryRow): MemoryRecord {
  const relatedCategory = mapCategoryRow(row.categories);

  return {
    id: String(row.id),
    name: String(row.name),
    nickname:
      typeof row.nickname === "string" && row.nickname.trim().length > 0
        ? row.nickname
        : String(row.name),
    department: typeof row.department === "string" ? row.department : "",
    description: String(row.description ?? ""),
    imageUrl: String(row.image_url),
    imageKey: String(row.image_key),
    categoryId: row.category_id ? String(row.category_id) : null,
    category: relatedCategory,
    imageWidth:
      typeof row.image_width === "number" ? row.image_width : undefined,
    imageHeight:
      typeof row.image_height === "number" ? row.image_height : undefined,
    createdAt: toTimestamp(row.created_at),
    updatedAt: toTimestamp(row.updated_at),
    status: row.status === "published" ? "published" : "published",
    isVisible: row.is_visible !== false,
    isCategoryFeatured: row.is_category_featured === true,
    isMainFeatured: row.is_main_featured === true,
    thumbnailUrl:
      typeof row.thumbnail_url === "string" ? row.thumbnail_url : undefined,
    eventId: typeof row.event_id === "string" ? row.event_id : undefined,
    authorId: typeof row.author_id === "string" ? row.author_id : undefined,
    isDeleted: row.is_deleted === true,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : null,
  };
}

function mapCategoryRow(value: unknown): CategoryRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const row = value as CategoryRow;

  return {
    id: String(row.id),
    parentId: row.parent_id ? String(row.parent_id) : null,
    name: String(row.name),
    slug: String(row.slug),
    path: String(row.path),
    depth: Number(row.depth ?? 0),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: toTimestamp(row.created_at),
    updatedAt: toTimestamp(row.updated_at),
  };
}

function assertNoError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

function createMemorySelect() {
  return `
    *,
    categories (
      id,
      parent_id,
      name,
      slug,
      path,
      depth,
      sort_order,
      created_at,
      updated_at
    )
  `;
}

export async function getMemoryById(id: string) {
  const supabase = getSupabasePublic();
  const { data, error } = await supabase
    .from("memories")
    .select(createMemorySelect())
    .eq("id", id)
    .maybeSingle();

  assertNoError(error);

  return data ? mapMemoryRow(data as unknown as MemoryRow) : null;
}

export async function listAllMemories(options?: {
  limit?: number;
  searchQuery?: string;
  categoryIds?: string[];
  onlyVisible?: boolean;
  onlyMainFeatured?: boolean;
  onlyCategoryFeatured?: boolean;
}) {
  if (options?.categoryIds && options.categoryIds.length === 0) {
    return [];
  }

  const supabase = getSupabasePublic();
  let query = supabase
    .from("memories")
    .select(createMemorySelect())
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (options?.onlyVisible) {
    query = query.eq("is_visible", true);
  }

  if (options?.onlyMainFeatured) {
    query = query.eq("is_main_featured", true);
  }

  if (options?.onlyCategoryFeatured) {
    query = query.eq("is_category_featured", true);
  }

  if (options?.categoryIds?.length === 1) {
    query = query.eq("category_id", options.categoryIds[0]);
  } else if (options?.categoryIds && options.categoryIds.length > 1) {
    query = query.in("category_id", options.categoryIds);
  }

  if (options?.searchQuery?.trim()) {
    query = query.ilike("name", `%${options.searchQuery.trim()}%`);
  }

  if (typeof options?.limit === "number") {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  assertNoError(error);

  return (data ?? []).map((row) => mapMemoryRow(row as unknown as MemoryRow));
}

export async function listPublishedMemories(limit = 120) {
  return listAllMemories({ limit, onlyVisible: true });
}

export async function getMainFeaturedMemories(limit = 12) {
  return listAllMemories({
    limit,
    onlyVisible: true,
    onlyMainFeatured: true,
  });
}

export async function getCategoryFeaturedMemories(
  categoryIds: string[],
  limit = 24,
) {
  return listAllMemories({
    limit,
    categoryIds,
    onlyVisible: true,
    onlyCategoryFeatured: true,
  });
}

export async function createMemory(input: CreateMemoryInput) {
  const supabase = getSupabasePublic();
  const { data, error } = await supabase
    .from("memories")
    .insert({
      name: input.name,
      nickname: input.nickname ?? input.name,
      department: input.department ?? "",
      description: input.description ?? "",
      image_url: input.imageUrl,
      image_key: input.imageKey,
      category_id: input.categoryId,
      image_width: input.imageWidth ?? null,
      image_height: input.imageHeight ?? null,
      status: "published",
      is_visible: input.isVisible !== false,
      is_category_featured: input.isCategoryFeatured === true,
      is_main_featured: input.isMainFeatured === true,
      is_deleted: false,
      sort_order: null,
    })
    .select(createMemorySelect())
    .single();

  assertNoError(error);

  return mapMemoryRow(data as unknown as MemoryRow);
}

export async function updateMemory(id: string, input: UpdateMemoryInput) {
  const existingMemory = await getMemoryById(id);

  if (!existingMemory) {
    throw new Error("수정할 데이터를 찾지 못했어요.");
  }

  const supabase = getSupabasePublic();
  const { data, error } = await supabase
    .from("memories")
    .update({
      name: input.name,
      nickname: input.nickname ?? input.name,
      department: input.department ?? "",
      description: input.description ?? "",
      category_id: input.categoryId,
      is_visible: input.isVisible,
      is_category_featured: input.isCategoryFeatured,
      is_main_featured: input.isMainFeatured,
      updated_at: new Date().toISOString(),
      ...(input.imageUrl ? { image_url: input.imageUrl } : {}),
      ...(input.imageKey ? { image_key: input.imageKey } : {}),
      ...(typeof input.imageWidth === "number"
        ? { image_width: input.imageWidth }
        : {}),
      ...(typeof input.imageHeight === "number"
        ? { image_height: input.imageHeight }
        : {}),
    })
    .eq("id", id)
    .select(createMemorySelect())
    .single();

  assertNoError(error);

  return mapMemoryRow(data as unknown as MemoryRow);
}

export async function deleteMemory(id: string) {
  const supabase = getSupabasePublic();
  const { error } = await supabase.from("memories").delete().eq("id", id);

  assertNoError(error);
}
