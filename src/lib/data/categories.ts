import { demoCategories } from "@/lib/demo";
import { env, isSupabaseConfigured } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { buildCategoryPath, slugify } from "@/lib/utils";
import type { CategoryNode } from "@/types/domain";

function mapCategory(row: Record<string, unknown>): CategoryNode {
  return {
    id: String(row.id),
    eventSlug: String(row.event_slug),
    parentId: row.parent_id ? String(row.parent_id) : null,
    name: String(row.name),
    slug: String(row.slug),
    description: row.description ? String(row.description) : null,
    coverMediaId: row.cover_media_id ? String(row.cover_media_id) : null,
    sortOrder: Number(row.sort_order ?? 0),
    depth: Number(row.depth ?? 0),
    path: String(row.path),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function getCategoryTree(eventSlug = env.DEFAULT_EVENT_SLUG) {
  if (!isSupabaseConfigured()) {
    return demoCategories.filter((item) => item.eventSlug === eventSlug);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("event_slug", eventSlug)
    .order("path", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapCategory(row as Record<string, unknown>));
}

export async function getCategoryByPath(path: string, eventSlug = env.DEFAULT_EVENT_SLUG) {
  const categories = await getCategoryTree(eventSlug);
  return categories.find((item) => item.path === path) ?? null;
}

export async function createCategory(input: {
  eventSlug?: string;
  parentId?: string | null;
  name: string;
  description?: string | null;
  sortOrder?: number;
}) {
  const eventSlug = input.eventSlug ?? env.DEFAULT_EVENT_SLUG;
  const parent = input.parentId
    ? (await getCategoryTree(eventSlug)).find((item) => item.id === input.parentId) ?? null
    : null;
  const slug = slugify(input.name);
  const path = buildCategoryPath(parent?.path ?? null, slug);
  const depth = parent ? parent.depth + 1 : 0;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("categories")
    .insert({
      event_slug: eventSlug,
      parent_id: input.parentId ?? null,
      name: input.name,
      slug,
      description: input.description ?? null,
      cover_media_id: null,
      sort_order: input.sortOrder ?? 0,
      depth,
      path,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapCategory(data as Record<string, unknown>);
}

export async function updateCategory(
  id: string,
  updates: {
    name?: string;
    description?: string | null;
    parentId?: string | null;
    sortOrder?: number;
  },
) {
  const supabase = getSupabaseAdmin();
  const existingCategories = await getCategoryTree();
  const current = existingCategories.find((item) => item.id === id);

  if (!current) {
    throw new Error("Category not found.");
  }

  const parent =
    updates.parentId === undefined
      ? current.parentId
        ? existingCategories.find((item) => item.id === current.parentId) ?? null
        : null
      : updates.parentId
        ? existingCategories.find((item) => item.id === updates.parentId) ?? null
        : null;

  const name = updates.name ?? current.name;
  const slug = slugify(name);
  const path = buildCategoryPath(parent?.path ?? null, slug);
  const depth = parent ? parent.depth + 1 : 0;

  const { data, error } = await supabase
    .from("categories")
    .update({
      name,
      slug,
      description: updates.description ?? current.description,
      parent_id: updates.parentId ?? current.parentId,
      sort_order: updates.sortOrder ?? current.sortOrder,
      path,
      depth,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapCategory(data as Record<string, unknown>);
}

export async function deleteCategory(id: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return { success: true };
}
