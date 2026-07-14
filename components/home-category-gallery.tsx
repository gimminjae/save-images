"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { MainMemorySpotlight } from "@/components/main-memory-spotlight";
import type { CategoryRecord } from "@/types/category";
import type { MemoryRecord } from "@/types/memory";

type HomeCategoryGalleryProps = {
  categories: CategoryRecord[];
  categoryFeaturedMemories: MemoryRecord[];
  initialSelectedCategoryId: string | null;
  mainFeatured: MemoryRecord[];
};

const MEMORY_SWAP_DELAY_MS = 160;

function getDescendantIds(categories: CategoryRecord[], categoryId: string) {
  const current = categories.find((category) => category.id === categoryId);

  if (!current) {
    return [];
  }

  return categories
    .filter(
      (category) =>
        category.id === categoryId || category.path.startsWith(`${current.path}/`),
    )
    .map((category) => category.id);
}

function getAncestorAtDepth(
  categories: CategoryRecord[],
  category: CategoryRecord,
  targetDepth: number,
) {
  let current: CategoryRecord | null = category;

  while (current && current.depth > targetDepth) {
    current = current.parentId
      ? categories.find((item) => item.id === current?.parentId) ?? null
      : null;
  }

  return current && current.depth === targetDepth ? current : null;
}

function isActiveCategory(category: CategoryRecord, selectedPath: string | null) {
  if (!selectedPath) {
    return false;
  }

  return (
    selectedPath === category.path || selectedPath.startsWith(`${category.path}/`)
  );
}

export function HomeCategoryGallery({
  categories,
  categoryFeaturedMemories,
  initialSelectedCategoryId,
  mainFeatured,
}: HomeCategoryGalleryProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    initialSelectedCategoryId,
  );
  const [visibleCategoryId, setVisibleCategoryId] = useState(
    initialSelectedCategoryId,
  );
  const [isSwitching, setIsSwitching] = useState(false);
  const swapTimeoutRef = useRef<number | null>(null);

  const primaryCategories = useMemo(
    () =>
      categories.some((category) => category.depth === 1)
        ? categories.filter((category) => category.depth === 1)
        : categories.filter((category) => category.depth === 0),
    [categories],
  );

  const selectedCategory = useMemo(
    () =>
      selectedCategoryId
        ? categories.find((category) => category.id === selectedCategoryId) ?? null
        : null,
    [categories, selectedCategoryId],
  );

  const selectedPrimaryCategory = useMemo(
    () =>
      selectedCategory
        ? selectedCategory.depth === 1
          ? selectedCategory
          : getAncestorAtDepth(categories, selectedCategory, 1)
        : null,
    [categories, selectedCategory],
  );

  const secondaryCategories = useMemo(
    () =>
      selectedPrimaryCategory
        ? categories.filter(
            (category) => category.parentId === selectedPrimaryCategory.id,
          )
        : [],
    [categories, selectedPrimaryCategory],
  );

  const selectedCategoryPath = selectedCategory?.path ?? null;

  const displayMemories = useMemo(() => {
    if (!visibleCategoryId) {
      return mainFeatured;
    }

    const descendantIds = getDescendantIds(categories, visibleCategoryId);

    if (descendantIds.length === 0) {
      return [];
    }

    const descendantIdSet = new Set(descendantIds);

    return categoryFeaturedMemories
      .filter(
        (memory) =>
          typeof memory.categoryId === "string" &&
          descendantIdSet.has(memory.categoryId),
      )
      .slice(0, 12);
  }, [categories, categoryFeaturedMemories, mainFeatured, visibleCategoryId]);

  function handleCategorySelect(nextCategoryId: string | null) {
    if (nextCategoryId === selectedCategoryId && nextCategoryId === visibleCategoryId) {
      return;
    }

    setSelectedCategoryId(nextCategoryId);
    setIsSwitching(true);

    if (swapTimeoutRef.current !== null) {
      window.clearTimeout(swapTimeoutRef.current);
    }

    const nextUrl = new URL(window.location.href);

    if (nextCategoryId) {
      nextUrl.searchParams.set("category", nextCategoryId);
    } else {
      nextUrl.searchParams.delete("category");
    }

    window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}`);

    swapTimeoutRef.current = window.setTimeout(() => {
      startTransition(() => {
        setVisibleCategoryId(nextCategoryId);
      });

      window.requestAnimationFrame(() => {
        setIsSwitching(false);
      });

      swapTimeoutRef.current = null;
    }, MEMORY_SWAP_DELAY_MS);
  }

  useEffect(() => {
    return () => {
      if (swapTimeoutRef.current !== null) {
        window.clearTimeout(swapTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 rounded-[32px] px-4 py-4 shadow-[0_18px_46px_rgba(0,0,0,0.22)] sm:px-5">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => handleCategorySelect(null)}
            className={`rounded-full px-5 py-2.5 text-sm font-black transition ${
              !selectedCategory
                ? "scale-[1.02] bg-white text-slate-950 ring-2 ring-white/90 shadow-[0_12px_30px_rgba(255,255,255,0.24)]"
                : "bg-white/88 text-slate-950 ring-1 ring-white/35 shadow-[0_10px_24px_rgba(0,0,0,0.16)] hover:bg-white"
            }`}
          >
            홈
          </button>

          {primaryCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => handleCategorySelect(category.id)}
              className={`rounded-full px-5 py-2.5 text-sm font-black transition ${
                isActiveCategory(category, selectedCategoryPath)
                  ? "scale-[1.02] bg-white text-slate-950 ring-2 ring-white/90 shadow-[0_12px_30px_rgba(255,255,255,0.24)]"
                  : "bg-white/88 text-slate-950 ring-1 ring-white/35 shadow-[0_10px_24px_rgba(0,0,0,0.16)] hover:bg-white"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {secondaryCategories.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {secondaryCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategorySelect(category.id)}
                className={`rounded-full px-4 py-2 text-xs font-black transition sm:text-sm ${
                  isActiveCategory(category, selectedCategoryPath)
                    ? "scale-[1.02] bg-sky-100 text-sky-950 ring-2 ring-sky-100/90 shadow-[0_10px_24px_rgba(126,220,255,0.22)]"
                    : "bg-white/82 text-slate-950 ring-1 ring-white/32 shadow-[0_8px_18px_rgba(0,0,0,0.14)] hover:bg-white"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div
        className={`w-full pb-8 transition-all duration-300 ${
          isSwitching
            ? "translate-y-3 opacity-0 blur-[2px]"
            : "translate-y-0 opacity-100 blur-0"
        }`}
      >
        <MainMemorySpotlight
          memories={displayMemories}
          emptyMessage={
            selectedCategory
              ? "선택한 카테고리의 대표 이미지가 없습니다."
              : "메인 설정된 이미지가 없습니다."
          }
        />
      </div>
    </>
  );
}
