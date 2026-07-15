"use client";

import { useMemo } from "react";
import { MainMemorySpotlight } from "@/components/main-memory-spotlight";
import type { MemoryRecord } from "@/types/memory";

type HomeCategoryGalleryProps = {
  mainFeatured: MemoryRecord[];
};

function shuffleMemories(memories: MemoryRecord[], limit?: number) {
  const shuffled = [...memories];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index];

    shuffled[index] = shuffled[randomIndex];
    shuffled[randomIndex] = current;
  }

  if (typeof limit === "number") {
    return shuffled.slice(0, limit);
  }

  return shuffled;
}

export function HomeCategoryGallery({
  mainFeatured,
}: HomeCategoryGalleryProps) {
  const displayMemories = useMemo(
    () =>
      shuffleMemories(
        mainFeatured.filter((memory) => memory.isMainFeatured === true),
      ),
    [mainFeatured],
  );

  return (
    <>
      {/* 메인 화면 카테고리 선택 UI는 잠시 숨김
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 rounded-[28px] bg-white/[0.06] px-3 py-3 shadow-[0_18px_46px_rgba(0,0,0,0.22)] backdrop-blur-[3px] sm:rounded-[32px] sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => handleCategorySelect(null)}
            className={`min-w-[6.3rem] rounded-full px-4 py-2.5 text-[0.82rem] font-black transition sm:min-w-[7rem] sm:px-5 sm:text-sm ${
              !selectedCategory
                ? "scale-[1.02] bg-white text-slate-950 ring-2 ring-white/90 shadow-[0_12px_30px_rgba(255,255,255,0.24)]"
                : "bg-black/28 text-white ring-1 ring-white/24 shadow-[0_10px_24px_rgba(0,0,0,0.18)] hover:bg-black/36"
            }`}
          >
            홈
          </button>

          {primaryCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => handleCategorySelect(category.id)}
              className={`min-w-[6.3rem] rounded-full px-4 py-2.5 text-[0.82rem] font-black transition sm:min-w-[7rem] sm:px-5 sm:text-sm ${
                selectedPrimaryCategory?.id === category.id
                  ? "scale-[1.02] bg-white text-slate-950 ring-2 ring-white/90 shadow-[0_12px_30px_rgba(255,255,255,0.24)]"
                  : "bg-black/28 text-white ring-1 ring-white/24 shadow-[0_10px_24px_rgba(0,0,0,0.18)] hover:bg-black/36"
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
                className={`min-w-[5.7rem] rounded-full px-3.5 py-2 text-[0.74rem] font-black transition sm:min-w-[6.3rem] sm:px-4 sm:text-sm ${
                  isCategoryInSelectedLineage(
                    categories,
                    category.id,
                    selectedCategoryId,
                  )
                    ? "scale-[1.02] bg-sky-100 text-sky-950 ring-2 ring-sky-100/90 shadow-[0_10px_24px_rgba(126,220,255,0.22)]"
                    : "bg-black/22 text-white ring-1 ring-white/24 shadow-[0_8px_18px_rgba(0,0,0,0.16)] hover:bg-black/30"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      */}

      <div className="w-full pb-6 sm:pb-8">
        <MainMemorySpotlight
          memories={displayMemories}
          emptyMessage="메인 설정된 이미지가 없습니다."
          syncMainFeatureVisibility
        />
      </div>
    </>
  );
}
