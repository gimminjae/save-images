"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { LuLayoutGrid, LuPanelsTopLeft, LuX } from "react-icons/lu";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { ImageExhibitionGrid } from "@/components/image-exhibition-grid";
import { MainMemorySpotlight } from "@/components/main-memory-spotlight";
import { SiteShell } from "@/components/site-shell";
import {
  fetchCategoryTree,
  fetchPublishedMemories,
  isAbortError,
} from "@/lib/api-client";
import { getMissingSupabasePublicEnv } from "@/lib/env";
import type { CategoryRecord } from "@/types/category";
import type { MemoryRecord } from "@/types/memory";

type GallerySection = {
  id: string;
  memories: MemoryRecord[];
  name: string;
};

type GalleryViewMode = "grid" | "spotlight";

function getPrimaryCategories(categories: CategoryRecord[]) {
  const depthOneCategories = categories.filter((category) => category.depth === 1);

  if (depthOneCategories.length > 0) {
    return depthOneCategories;
  }

  return categories.filter((category) => category.depth === 0);
}

function getCategoryLabel(
  category: Pick<CategoryRecord, "depth" | "name">,
  baseDepth = 0,
) {
  const relativeDepth = Math.max(category.depth - baseDepth, 0);

  if (relativeDepth <= 0) {
    return category.name;
  }

  return `${"· ".repeat(Math.min(relativeDepth, 4))}${category.name}`;
}

export default function GalleryPage() {
  const missingEnvVars = useMemo(() => getMissingSupabasePublicEnv(), []);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [hasInitializedCategoryFilter, setHasInitializedCategoryFilter] =
    useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<GalleryViewMode>("grid");
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(missingEnvVars.length === 0);
  const [isSwitchingCategory, setIsSwitchingCategory] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const primaryCategories = useMemo(
    () => getPrimaryCategories(categories),
    [categories],
  );
  const primaryDepth = primaryCategories[0]?.depth ?? 1;

  useEffect(() => {
    if (missingEnvVars.length > 0) {
      return;
    }

    const controller = new AbortController();

    void fetchCategoryTree(controller.signal)
      .then((loadedCategories) => {
        const primaryLoadedCategories = getPrimaryCategories(loadedCategories);
        const url = new URL(window.location.href);
        const categoryId = url.searchParams.get("category");
        const viewParam = url.searchParams.get("view");
        const fallbackCategoryId =
          primaryLoadedCategories[0]?.id ?? loadedCategories[0]?.id ?? null;
        const nextSelectedCategoryId =
          categoryId &&
          loadedCategories.some((category) => category.id === categoryId)
            ? categoryId
            : fallbackCategoryId;

        startTransition(() => {
          setCategories(loadedCategories);
          setSelectedCategoryId(nextSelectedCategoryId);
          setViewMode(viewParam === "spotlight" ? "spotlight" : "grid");
          setHasInitializedCategoryFilter(true);
        });
      })
      .catch((error) => {
        if (isAbortError(error)) {
          return;
        }

        console.error("Failed to load gallery data", error);
        setLoadError("카테고리 목록을 불러오지 못했어요.");
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [missingEnvVars]);

  const selectedPrimaryCategoryId = useMemo(() => {
    if (primaryCategories.length === 0 || !selectedCategoryId) {
      return null;
    }

    let current = categoryMap.get(selectedCategoryId) ?? null;

    while (current) {
      if (current.depth === primaryDepth) {
        return current.id;
      }

      current = current.parentId
        ? (categoryMap.get(current.parentId) ?? null)
        : null;
    }

    return null;
  }, [categoryMap, primaryCategories, primaryDepth, selectedCategoryId]);

  const selectedPrimaryCategory = useMemo(
    () =>
      selectedPrimaryCategoryId
        ? (categoryMap.get(selectedPrimaryCategoryId) ?? null)
        : null,
    [categoryMap, selectedPrimaryCategoryId],
  );

  const secondaryCategories = useMemo(() => {
    if (!selectedPrimaryCategory) {
      return [];
    }

    return categories.filter(
      (category) => category.parentId === selectedPrimaryCategory.id,
    );
  }, [categories, selectedPrimaryCategory]);

  const selectedSecondaryCategoryId = useMemo(() => {
    if (!selectedCategoryId || !selectedPrimaryCategory) {
      return null;
    }

    if (selectedCategoryId === selectedPrimaryCategory.id) {
      return null;
    }

    let current = categoryMap.get(selectedCategoryId) ?? null;

    while (current) {
      if (current.parentId === selectedPrimaryCategory.id) {
        return current.id;
      }

      current = current.parentId
        ? (categoryMap.get(current.parentId) ?? null)
        : null;
    }

    return null;
  }, [categoryMap, selectedCategoryId, selectedPrimaryCategory]);

  useEffect(() => {
    if (!hasInitializedCategoryFilter) {
      return;
    }

    const url = new URL(window.location.href);

    if (selectedCategoryId) {
      url.searchParams.set("category", selectedCategoryId);
    } else {
      url.searchParams.delete("category");
    }

    if (viewMode === "spotlight") {
      url.searchParams.set("view", "spotlight");
    } else {
      url.searchParams.delete("view");
    }

    window.history.replaceState({}, "", url.toString());
  }, [hasInitializedCategoryFilter, selectedCategoryId, viewMode]);

  useEffect(() => {
    if (missingEnvVars.length > 0 || !hasInitializedCategoryFilter) {
      return;
    }

    const controller = new AbortController();

    void fetchPublishedMemories({
      limit: 500,
      categoryId: selectedCategoryId ?? undefined,
      includeDescendants: selectedCategoryId ? true : undefined,
      signal: controller.signal,
    })
      .then((loadedMemories) => {
        startTransition(() => {
          setMemories(loadedMemories);
        });
      })
      .catch((error) => {
        if (isAbortError(error)) {
          return;
        }

        console.error("Failed to load gallery memories", error);
        setLoadError(
          selectedCategoryId
            ? "선택한 카테고리의 이미지를 불러오지 못했어요."
            : "전체 이미지를 불러오지 못했어요.",
        );
      })
      .finally(() => {
        if (controller.signal.aborted) {
          return;
        }

        setIsLoading(false);
        setIsSwitchingCategory(false);
      });

    return () => {
      controller.abort();
    };
  }, [hasInitializedCategoryFilter, missingEnvVars, selectedCategoryId]);

  function handleCategorySelect(nextCategoryId: string) {
    if (nextCategoryId === selectedCategoryId) {
      return;
    }

    setLoadError(null);
    setIsSwitchingCategory(true);
    setSelectedCategoryId(nextCategoryId);
  }

  function handleCategoryClear() {
    if (!selectedCategoryId) {
      return;
    }

    setLoadError(null);
    setIsSwitchingCategory(true);
    setSelectedCategoryId(null);
  }

  const selectedCategory = useMemo(
    () =>
      selectedCategoryId
        ? categories.find((category) => category.id === selectedCategoryId) ??
          null
        : null,
    [categories, selectedCategoryId],
  );

  const selectedBranchCategories = useMemo(() => {
    if (!selectedCategory) {
      return categories;
    }

    const prefix = `${selectedCategory.path}/`;

    return categories.filter(
      (category) =>
        category.id === selectedCategory.id || category.path.startsWith(prefix),
    );
  }, [categories, selectedCategory]);

  const sections = useMemo<GallerySection[]>(() => {
    const memoriesByCategoryId = new Map<string, MemoryRecord[]>();
    const uncategorizedMemories: MemoryRecord[] = [];

    memories.forEach((memory) => {
      if (!memory.categoryId) {
        uncategorizedMemories.push(memory);
        return;
      }

      const current = memoriesByCategoryId.get(memory.categoryId) ?? [];
      current.push(memory);
      memoriesByCategoryId.set(memory.categoryId, current);
    });

    const orderedSections = selectedBranchCategories.reduce<GallerySection[]>(
      (accumulator, category) => {
        const categoryMemories = memoriesByCategoryId.get(category.id);

        if (!categoryMemories || categoryMemories.length === 0) {
          return accumulator;
        }

        accumulator.push({
          id: category.id,
          memories: categoryMemories,
          name: selectedCategory
            ? getCategoryLabel(category, selectedCategory.depth)
            : getCategoryLabel(category),
        });

        return accumulator;
      },
      [],
    );

    if (!selectedCategory && uncategorizedMemories.length > 0) {
      orderedSections.push({
        id: "uncategorized",
        memories: uncategorizedMemories,
        name: "미분류",
      });
    }

    return orderedSections;
  }, [memories, selectedBranchCategories, selectedCategory]);

  return (
    <SiteShell currentPath="/gallery">
      {missingEnvVars.length > 0 ? (
        <ConfigurationNotice missingKeys={missingEnvVars} />
      ) : (
        <section className="px-5 py-6 sm:px-6 sm:py-7">

          <div className="mt-5 space-y-3">
            <div className="rounded-[24px] border border-white/60 bg-white/62 px-4 py-4 shadow-[0_14px_28px_rgba(21,84,144,0.08)] backdrop-blur-md">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
                    {selectedCategoryId ? (
                      <button
                        type="button"
                        onClick={handleCategoryClear}
                        aria-label="전체 이미지 보기"
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-[0_10px_20px_rgba(244,63,94,0.24)] transition hover:bg-rose-600"
                      >
                        <LuX className="h-4 w-4" />
                      </button>
                    ) : null}

                    {primaryCategories.map((category) => {
                      const isActive = selectedPrimaryCategoryId === category.id;

                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => handleCategorySelect(category.id)}
                          className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-black transition ${
                            isActive
                              ? "bg-slate-950 text-white shadow-[0_12px_24px_rgba(15,23,42,0.24)]"
                              : "bg-white/84 text-slate-700 shadow-[0_10px_20px_rgba(21,84,144,0.08)] hover:bg-white"
                          }`}
                        >
                          {category.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex shrink-0 justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black transition ${
                      viewMode === "grid"
                        ? "bg-slate-950 text-white shadow-[0_12px_24px_rgba(15,23,42,0.24)]"
                        : "bg-white/84 text-slate-700 shadow-[0_10px_20px_rgba(21,84,144,0.08)] hover:bg-white"
                    }`}
                  >
                    <LuLayoutGrid className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode("spotlight")}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black transition ${
                      viewMode === "spotlight"
                        ? "bg-slate-950 text-white shadow-[0_12px_24px_rgba(15,23,42,0.24)]"
                        : "bg-white/84 text-slate-700 shadow-[0_10px_20px_rgba(21,84,144,0.08)] hover:bg-white"
                    }`}
                  >
                    <LuPanelsTopLeft className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {secondaryCategories.length > 0 ? (
              <div className="rounded-[24px] border border-white/60 bg-white/58 px-4 py-4 shadow-[0_14px_28px_rgba(21,84,144,0.08)] backdrop-blur-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-black tracking-[0.18em] text-slate-500 uppercase">
                    하위 카테고리
                  </p>
                  <span className="text-xs font-bold text-slate-500">
                    {selectedPrimaryCategory?.name ?? "미선택"} 전체 포함
                  </span>
                </div>

                <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() =>
                      selectedPrimaryCategoryId
                        ? handleCategorySelect(selectedPrimaryCategoryId)
                        : undefined
                    }
                    className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-black transition ${
                      !selectedSecondaryCategoryId
                        ? "bg-sky-100 text-sky-950 shadow-[0_10px_20px_rgba(125,211,252,0.22)]"
                        : "bg-white/84 text-slate-700 shadow-[0_10px_20px_rgba(21,84,144,0.08)] hover:bg-white"
                    }`}
                  >
                    전체
                  </button>

                  {secondaryCategories.map((category) => {
                    const isActive = selectedSecondaryCategoryId === category.id;

                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => handleCategorySelect(category.id)}
                        className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-black transition ${
                          isActive
                            ? "bg-slate-950 text-white shadow-[0_12px_24px_rgba(15,23,42,0.24)]"
                            : "bg-white/84 text-slate-700 shadow-[0_10px_20px_rgba(21,84,144,0.08)] hover:bg-white"
                        }`}
                      >
                        {category.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {loadError ? (
            <div className="event-panel-strong mt-5 rounded-[24px] px-5 py-4 text-sm text-rose-800">
              {loadError}
            </div>
          ) : null}

          <div className="relative mt-5">
            {isLoading ? (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[28px] border border-white/55 bg-white/55 p-4 sm:p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="h-8 w-36 animate-pulse rounded-full bg-white/80" />
                      <div className="h-8 w-16 animate-pulse rounded-full bg-white/75" />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                      {Array.from({ length: 4 }).map((_, cardIndex) => (
                        <div
                          key={cardIndex}
                          className="h-40 animate-pulse rounded-[18px] bg-white/75 sm:h-56 sm:rounded-[24px]"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : sections.length === 0 ? (
              <div className="event-panel-strong rounded-[28px] px-5 py-10 text-center text-sm font-bold text-slate-600">
                {selectedCategory
                  ? "선택한 카테고리에 공개된 이미지가 없습니다."
                  : "공개된 이미지가 없습니다."}
              </div>
            ) : (
              <div
                className={`space-y-6 transition-opacity duration-500 ${
                  isSwitchingCategory ? "opacity-45" : "opacity-100"
                }`}
              >
                {sections.map((section) => (
                  <section
                    key={`${section.id}:${selectedCategoryId ?? "all"}:${viewMode}`}
                    className="p-4 shadow-[0_16px_34px_rgba(33,110,178,0.1)] sm:p-5"
                    style={{
                      containIntrinsicSize: "1000px",
                      contentVisibility: "auto",
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {/* <h2 className="text-2xl font-black tracking-[-0.05em] break-words text-slate-950 sm:text-3xl">
                        {section.name}
                      </h2> */}
                      <span className="rounded-full bg-white/90 px-4 py-2 text-sm font-black text-sky-950">
                        {section.memories.length}장
                      </span>
                    </div>

                    <div className="mt-4">
                      {viewMode === "grid" ? (
                        <ImageExhibitionGrid
                          memories={section.memories}
                          emptyMessage=""
                        />
                      ) : (
                        <MainMemorySpotlight
                          memories={section.memories}
                          emptyMessage=""
                        />
                      )}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {isSwitchingCategory ? (
              <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
                <div className="rounded-full border border-white/12 bg-slate-950/78 px-4 py-2 text-xs font-black text-white shadow-[0_12px_26px_rgba(0,0,0,0.24)] backdrop-blur-md">
                  카테고리 이미지를 불러오는 중...
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )}
    </SiteShell>
  );
}
