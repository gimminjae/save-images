import type { CategoryRecord } from "@/types/category";
import type { MemoryRecord } from "@/types/memory";

type ApiErrorPayload = {
  error?: string;
};

type PublishedMemoriesResponse = {
  memories?: MemoryRecord[];
  error?: string;
};

type CategoriesResponse = {
  categories?: CategoryRecord[];
  error?: string;
};

function buildPath(
  pathname: string,
  query?: Record<string, string | number | boolean | undefined>,
) {
  if (!query) {
    return pathname;
  }

  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

export async function readJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => null)) as
    | ApiErrorPayload
    | T
    | null;

  if (!response.ok) {
    throw new Error(
      payload &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof payload.error === "string"
        ? payload.error
        : "요청을 처리하지 못했어요.",
    );
  }

  return payload as T;
}

export async function fetchCategoryTree(signal?: AbortSignal) {
  const payload = await readJson<CategoriesResponse>("/api/categories/tree", {
    cache: "no-store",
    signal,
  });

  return Array.isArray(payload.categories) ? payload.categories : [];
}

export async function fetchPublishedMemories(
  options?: {
    limit?: number;
    mainFeatured?: boolean;
    categoryFeatured?: boolean;
    categoryId?: string;
    includeDescendants?: boolean;
    signal?: AbortSignal;
  },
) {
  const payload = await readJson<PublishedMemoriesResponse>(
    buildPath("/api/memories", {
      limit: options?.limit,
      mainFeatured: options?.mainFeatured,
      categoryFeatured: options?.categoryFeatured,
      categoryId: options?.categoryId,
      includeDescendants: options?.includeDescendants,
    }),
    {
      cache: "no-store",
      signal: options?.signal,
    },
  );

  return Array.isArray(payload.memories) ? payload.memories : [];
}

export async function fetchAdminMemories(
  options?: {
    limit?: number;
    signal?: AbortSignal;
  },
) {
  const payload = await readJson<PublishedMemoriesResponse>(
    buildPath("/api/admin/memories", {
      limit: options?.limit,
    }),
    {
      cache: "no-store",
      signal: options?.signal,
    },
  );

  return Array.isArray(payload.memories) ? payload.memories : [];
}
