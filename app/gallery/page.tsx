"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { ImageExhibitionGrid } from "@/components/image-exhibition-grid";
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
  depth: number;
  memories: MemoryRecord[];
  name: string;
};

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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(missingEnvVars.length === 0);
  const [isSwitchingCategory, setIsSwitchingCategory] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (missingEnvVars.length > 0) {
      return;
    }

    const controller = new AbortController();

    void fetchCategoryTree(controller.signal)
      .then((loadedCategories) => {
        const categoryId = new URL(window.location.href).searchParams.get(
          "category",
        );
        const nextSelectedCategoryId =
          categoryId &&
          loadedCategories.some((category) => category.id === categoryId)
            ? categoryId
            : loadedCategories[0]?.id ?? null;

        startTransition(() => {
          setCategories(loadedCategories);
          setSelectedCategoryId(nextSelectedCategoryId);
        });

        if (loadedCategories.length === 0) {
          setIsLoading(false);
        }
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

  useEffect(() => {
    if (!selectedCategoryId) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("category", selectedCategoryId);
    window.history.replaceState({}, "", url.toString());
  }, [selectedCategoryId]);

  useEffect(() => {
    if (missingEnvVars.length > 0 || !selectedCategoryId) {
      return;
    }

    const controller = new AbortController();

    void fetchPublishedMemories({
      limit: 500,
      categoryId: selectedCategoryId,
      includeDescendants: true,
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
        setLoadError("선택한 카테고리의 이미지를 불러오지 못했어요.");
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
  }, [missingEnvVars, selectedCategoryId]);

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
      return [];
    }

    const prefix = `${selectedCategory.path}/`;

    return categories.filter(
      (category) =>
        category.id === selectedCategory.id || category.path.startsWith(prefix),
    );
  }, [categories, selectedCategory]);

  const sections = useMemo<GallerySection[]>(() => {
    const memoriesByCategoryId = new Map<string, MemoryRecord[]>();

    memories.forEach((memory) => {
      if (!memory.categoryId) {
        return;
      }

      const current = memoriesByCategoryId.get(memory.categoryId) ?? [];
      current.push(memory);
      memoriesByCategoryId.set(memory.categoryId, current);
    });

    return selectedBranchCategories.reduce<GallerySection[]>(
      (accumulator, category) => {
        const categoryMemories = memoriesByCategoryId.get(category.id);

        if (!categoryMemories || categoryMemories.length === 0) {
          return accumulator;
        }

        accumulator.push({
          id: category.id,
          depth: category.depth,
          memories: categoryMemories,
          name: getCategoryLabel(
            category,
            selectedCategory?.depth ?? category.depth,
          ),
        });

        return accumulator;
      },
      [],
    );
  }, [memories, selectedBranchCategories, selectedCategory]);

  return (
    <SiteShell currentPath="/gallery">
      {missingEnvVars.length > 0 ? (
        <ConfigurationNotice missingKeys={missingEnvVars} />
      ) : (
        <section className="event-panel rounded-[36px] px-5 py-6 sm:px-6 sm:py-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
              모든 이미지
            </h1>
            <span className="rounded-full bg-white/85 px-4 py-2 text-sm font-black text-sky-950">
              총 {memories.length}장
            </span>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <label className="block">
              <span className="mb-2 block text-xs font-black tracking-[0.18em] text-slate-500 uppercase">
                카테고리 선택
              </span>
              <select
                value={selectedCategoryId ?? ""}
                onChange={(event) => {
                  const nextCategoryId = event.target.value || null;

                  if (!nextCategoryId || nextCategoryId === selectedCategoryId) {
                    return;
                  }

                  setLoadError(null);
                  setIsSwitchingCategory(true);
                  setSelectedCategoryId(nextCategoryId);
                }}
                disabled={categories.length === 0}
                className="event-input block w-full rounded-[22px] border border-white/70 bg-white/88 px-4 py-3 text-sm font-bold text-slate-800 shadow-[0_14px_28px_rgba(21,84,144,0.08)] outline-none transition focus:border-sky-300"
              >
                {categories.length === 0 ? (
                  <option value="">카테고리가 없습니다</option>
                ) : null}
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {getCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-[24px] border border-white/60 bg-white/62 px-4 py-3 shadow-[0_14px_28px_rgba(21,84,144,0.08)] backdrop-blur-md">
              <p className="text-xs font-black tracking-[0.18em] text-slate-500 uppercase">
                현재 보기
              </p>
              <p className="mt-1 text-lg font-black tracking-[-0.04em] text-slate-950">
                {selectedCategory?.name ?? "미선택"}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {selectedBranchCategories.length > 1
                  ? `하위 ${selectedBranchCategories.length - 1}개 카테고리 포함`
                  : "단일 카테고리 전시"}
              </p>
            </div>
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
            ) : categories.length === 0 ? (
              <div className="event-panel-strong rounded-[28px] px-5 py-10 text-center text-sm font-bold text-slate-600">
                먼저 카테고리를 만들어 주세요.
              </div>
            ) : sections.length === 0 ? (
              <div className="event-panel-strong rounded-[28px] px-5 py-10 text-center text-sm font-bold text-slate-600">
                선택한 카테고리에 공개된 이미지가 없습니다.
              </div>
            ) : (
              <div
                className={`space-y-6 transition-opacity duration-500 ${
                  isSwitchingCategory ? "opacity-45" : "opacity-100"
                }`}
              >
                {sections.map((section) => (
                  <section
                    key={section.id}
                    className="rounded-[28px] border border-sky-200/70 bg-white/58 p-4 shadow-[0_16px_34px_rgba(33,110,178,0.1)] backdrop-blur-md sm:p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-2xl font-black tracking-[-0.05em] break-words text-slate-950 sm:text-3xl">
                        {section.name}
                      </h2>
                      <span className="rounded-full bg-white/90 px-4 py-2 text-sm font-black text-sky-950">
                        {section.memories.length}장
                      </span>
                    </div>

                    <div className="mt-4">
                      <ImageExhibitionGrid
                        memories={section.memories}
                        emptyMessage=""
                      />
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
