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

type CachedApiResponse = {
  expiresAt: number;
  value: unknown;
};

const CATEGORY_TREE_CACHE_TTL_MS = 60 * 1000;
const MAIN_GALLERY_CACHE_TTL_MS = 60 * 1000;
const PUBLISHED_MEMORIES_CACHE_TTL_MS = 15 * 1000;
const apiResponseCache = new Map<string, CachedApiResponse>();

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

function readCachedValue<T>(cacheKey: string) {
  const cached = apiResponseCache.get(cacheKey);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    apiResponseCache.delete(cacheKey);
    return null;
  }

  return cached.value as T;
}

function storeCachedValue<T>(cacheKey: string, value: T, ttlMs: number) {
  apiResponseCache.set(cacheKey, {
    expiresAt: Date.now() + ttlMs,
    value,
  });
}

export function invalidateApiClientCache(matcher?: RegExp | string) {
  if (!matcher) {
    apiResponseCache.clear();
    return;
  }

  for (const key of apiResponseCache.keys()) {
    const matches =
      typeof matcher === "string" ? key.startsWith(matcher) : matcher.test(key);

    if (matches) {
      apiResponseCache.delete(key);
    }
  }
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
  const cacheKey = "categories:tree";
  const cached = readCachedValue<CategoriesResponse>(cacheKey);

  if (cached) {
    return Array.isArray(cached.categories) ? cached.categories : [];
  }

  const payload = await readJson<CategoriesResponse>("/api/categories/tree", {
    cache: "no-store",
    signal,
  });

  storeCachedValue(cacheKey, payload, CATEGORY_TREE_CACHE_TTL_MS);

  return Array.isArray(payload.categories) ? payload.categories : [];
}

export async function fetchPublishedMemories(
  options?: {
    limit?: number;
    offset?: number;
    mainFeatured?: boolean;
    categoryFeatured?: boolean;
    categoryId?: string;
    includeDescendants?: boolean;
    signal?: AbortSignal;
  },
) {
  const path = buildPath("/api/memories", {
    limit: options?.limit,
    offset: options?.offset,
    mainFeatured: options?.mainFeatured,
    categoryFeatured: options?.categoryFeatured,
    categoryId: options?.categoryId,
    includeDescendants: options?.includeDescendants,
  });
  const cacheKey = `published:${path}`;
  const cached = readCachedValue<PublishedMemoriesResponse>(cacheKey);

  if (cached) {
    return Array.isArray(cached.memories) ? cached.memories : [];
  }

  const payload = await readJson<PublishedMemoriesResponse>(path, {
    cache: "no-store",
    signal: options?.signal,
  });

  storeCachedValue(cacheKey, payload, PUBLISHED_MEMORIES_CACHE_TTL_MS);

  return Array.isArray(payload.memories) ? payload.memories : [];
}

export async function fetchMainGalleryMemories(signal?: AbortSignal) {
  const cacheKey = "main-gallery:memories";
  const cached = readCachedValue<PublishedMemoriesResponse>(cacheKey);

  if (cached) {
    return Array.isArray(cached.memories) ? cached.memories : [];
  }

  const payload = await readJson<PublishedMemoriesResponse>(
    "/api/main-gallery",
    {
      cache: "force-cache",
      signal,
    },
  );

  storeCachedValue(cacheKey, payload, MAIN_GALLERY_CACHE_TTL_MS);

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
