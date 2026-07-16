import mainGalleryImageNames from "@/data/main-gallery-images.json";
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
const MAIN_GALLERY_BASE_URL =
  "https://guri-church-bucket.s3.ap-southeast-2.amazonaws.com/hanmong/hanmong16main/";
const MAIN_GALLERY_REFERENCE_TIMESTAMP = Date.UTC(2026, 6, 16);
const MAIN_GALLERY_SUPPORTED_EXTENSIONS = /\.(jpe?g|png|webp|avif)$/i;

const MAIN_GALLERY_MEMORIES: MemoryRecord[] = mainGalleryImageNames
  .filter((imageName) => MAIN_GALLERY_SUPPORTED_EXTENSIONS.test(imageName))
  .map((imageName, index) => {
    const displayName = imageName.replace(/\.[^.]+$/, "");
    const imageUrl = new URL(imageName, MAIN_GALLERY_BASE_URL).toString();
    const timestamp = MAIN_GALLERY_REFERENCE_TIMESTAMP + index;

    return {
      id: `main-gallery:${imageName}`,
      name: displayName,
      nickname: displayName,
      department: "",
      description: "",
      imageUrl,
      imageKey: `hanmong/hanmong16main/${imageName}`,
      categoryId: null,
      category: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      status: "published" as const,
      isVisible: true,
      isCategoryFeatured: false,
      isMainFeatured: true,
      thumbnailUrl: imageUrl,
      downloadUrl: `/api/main-gallery/download/${encodeURIComponent(imageName)}`,
    };
  });

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
  const cacheKey = "main-gallery:s3-json:v1";
  const cached = readCachedValue<MemoryRecord[]>(cacheKey);

  if (cached) {
    return cached;
  }

  if (signal?.aborted) {
    const abortError = new Error("The operation was aborted.");
    abortError.name = "AbortError";
    throw abortError;
  }

  storeCachedValue(cacheKey, MAIN_GALLERY_MEMORIES, MAIN_GALLERY_CACHE_TTL_MS);

  return MAIN_GALLERY_MEMORIES;
}

export function getMainGalleryMemories() {
  return MAIN_GALLERY_MEMORIES;
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
