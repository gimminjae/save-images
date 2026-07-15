import "server-only";

import type { CategoryRecord } from "@/types/category";
import { getSupabasePublic } from "@/lib/supabase/server";
import { buildCategoryPath, slugify } from "@/lib/utils";

type CategoryRow = Record<string, unknown>;
type CategoryTreeCache = {
  expiresAt: number;
  value: CategoryRecord[];
};

const CATEGORY_TREE_CACHE_TTL_MS = 60 * 1000;
let categoryTreeCache: CategoryTreeCache | null = null;

function toTimestamp(value: unknown) {
  if (typeof value !== "string") {
    return Date.now();
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function mapCategoryRow(row: CategoryRow): CategoryRecord {
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

function readCategoryTreeCache() {
  if (!categoryTreeCache) {
    return null;
  }

  if (categoryTreeCache.expiresAt <= Date.now()) {
    categoryTreeCache = null;
    return null;
  }

  return categoryTreeCache.value;
}

function writeCategoryTreeCache(categories: CategoryRecord[]) {
  categoryTreeCache = {
    expiresAt: Date.now() + CATEGORY_TREE_CACHE_TTL_MS,
    value: categories,
  };
}

export function clearCategoryTreeCache() {
  categoryTreeCache = null;
}

export async function getCategoryTree(options?: { forceFresh?: boolean }) {
  if (!options?.forceFresh) {
    const cached = readCategoryTreeCache();

    if (cached) {
      return cached;
    }
  }

  const supabase = getSupabasePublic();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("path", { ascending: true })
    .order("sort_order", { ascending: true });

  assertNoError(error);

  const categories = (data ?? []).map((row) =>
    mapCategoryRow(row as unknown as CategoryRow),
  );
  writeCategoryTreeCache(categories);
  return categories;
}

export async function getCategoryById(id: string) {
  const categories = await getCategoryTree();
  return categories.find((category) => category.id === id) ?? null;
}

export async function getCategoryDescendantIds(id: string) {
  const categories = await getCategoryTree();
  const current = categories.find((category) => category.id === id);

  if (!current) {
    return [];
  }

  return categories
    .filter(
      (category) =>
        category.id === id || category.path.startsWith(`${current.path}/`),
    )
    .map((category) => category.id);
}

export async function createCategory(input: {
  name: string;
  parentId?: string | null;
  sortOrder?: number;
}) {
  const categories = await getCategoryTree({ forceFresh: true });
  const parent = input.parentId
    ? categories.find((category) => category.id === input.parentId) ?? null
    : null;

  if (input.parentId && !parent) {
    throw new Error("상위 카테고리를 찾지 못했어요.");
  }

  const slug = slugify(input.name);
  const path = buildCategoryPath(parent?.path ?? null, slug);
  const depth = parent ? parent.depth + 1 : 0;

  const supabase = getSupabasePublic();
  const { data, error } = await supabase
    .from("categories")
    .insert({
      parent_id: input.parentId ?? null,
      name: input.name,
      slug,
      path,
      depth,
      sort_order: input.sortOrder ?? 0,
    })
    .select("*")
    .single();

  assertNoError(error);
  clearCategoryTreeCache();

  return mapCategoryRow(data as unknown as CategoryRow);
}

export async function updateCategory(
  id: string,
  updates: {
    name?: string;
    parentId?: string | null;
    sortOrder?: number;
  },
) {
  const existingCategories = await getCategoryTree({ forceFresh: true });
  const current = existingCategories.find((category) => category.id === id);

  if (!current) {
    throw new Error("카테고리를 찾지 못했어요.");
  }

  const nextParentId =
    updates.parentId === undefined ? current.parentId : updates.parentId;
  const parent = nextParentId
    ? existingCategories.find((category) => category.id === nextParentId) ??
      null
    : null;

  if (nextParentId && !parent) {
    throw new Error("상위 카테고리를 찾지 못했어요.");
  }

  if (parent?.id === current.id) {
    throw new Error("카테고리를 자기 자신 아래로 이동할 수 없어요.");
  }

  if (parent && parent.path.startsWith(`${current.path}/`)) {
    throw new Error("카테고리를 자신의 하위 카테고리 아래로 이동할 수 없어요.");
  }

  const name = updates.name ?? current.name;
  const slug = slugify(name);
  const nextPath = buildCategoryPath(parent?.path ?? null, slug);
  const nextDepth = parent ? parent.depth + 1 : 0;

  const supabase = getSupabasePublic();
  const { data, error } = await supabase
    .from("categories")
    .update({
      name,
      slug,
      parent_id: nextParentId,
      sort_order: updates.sortOrder ?? current.sortOrder,
      path: nextPath,
      depth: nextDepth,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  assertNoError(error);

  const descendants = existingCategories.filter((category) =>
    category.path.startsWith(`${current.path}/`),
  );

  for (const descendant of descendants) {
    const suffix = descendant.path.slice(current.path.length);
    const adjustedDepth = nextDepth + (descendant.depth - current.depth);

    const { error: descendantError } = await supabase
      .from("categories")
      .update({
        path: `${nextPath}${suffix}`,
        depth: adjustedDepth,
        updated_at: new Date().toISOString(),
      })
      .eq("id", descendant.id);

    assertNoError(descendantError);
  }

  clearCategoryTreeCache();
  return mapCategoryRow(data as unknown as CategoryRow);
}

export async function deleteCategory(id: string) {
  const categories = await getCategoryTree({ forceFresh: true });
  const current = categories.find((category) => category.id === id);

  if (!current) {
    throw new Error("카테고리를 찾지 못했어요.");
  }

  const hasChildren = categories.some((category) => category.parentId === id);

  if (hasChildren) {
    throw new Error("하위 카테고리를 먼저 정리해 주세요.");
  }

  const supabase = getSupabasePublic();
  const { count, error: countError } = await supabase
    .from("memories")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id)
    .eq("is_deleted", false);

  assertNoError(countError);

  if ((count ?? 0) > 0) {
    throw new Error("이 카테고리를 사용하는 이미지를 먼저 정리해 주세요.");
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);

  assertNoError(error);
  clearCategoryTreeCache();

  return { success: true };
}
