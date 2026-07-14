"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { HomeCategoryGallery } from "@/components/home-category-gallery";
import { SiteShell } from "@/components/site-shell";
import {
  fetchCategoryTree,
  fetchPublishedMemories,
  isAbortError,
} from "@/lib/api-client";
import { getMissingSupabasePublicEnv } from "@/lib/env";
import type { CategoryRecord } from "@/types/category";
import type { MemoryRecord } from "@/types/memory";

function HomeScene({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-8 sm:py-10">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/main-page-background.jpg')] bg-cover bg-center"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,16,38,0.08)_0%,rgba(8,16,38,0.14)_28%,rgba(5,12,31,0.34)_56%,rgba(4,9,24,0.68)_82%,rgba(2,6,18,0.82)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_24%,rgba(0,0,0,0)_46%,rgba(3,8,24,0.24)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(180deg,rgba(112,244,255,0),rgba(112,244,255,0.12)_60%,rgba(146,255,205,0.16)_100%)]"
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8">
        <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center pt-8 sm:pt-12">
          <div className="w-full text-center">
            <h1 className="text-[clamp(2.4rem,6vw,4.4rem)] font-black tracking-[-0.08em] text-white drop-shadow-[0_10px_35px_rgba(8,18,44,0.55)] sm:leading-[0.95]">
              <span className="block text-white/92">제 16기</span>
              <span className="mt-2 block text-[clamp(3.4rem,10vw,7.6rem)]">
                한몽 청년수련회
              </span>
            </h1>
          </div>
        </div>

        {children}
      </div>
    </section>
  );
}

export default function Home() {
  const missingEnvVars = useMemo(() => getMissingSupabasePublicEnv(), []);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [mainFeatured, setMainFeatured] = useState<MemoryRecord[]>([]);
  const [categoryFeaturedMemories, setCategoryFeaturedMemories] = useState<
    MemoryRecord[]
  >([]);
  const [initialSelectedCategoryId, setInitialSelectedCategoryId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(missingEnvVars.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (missingEnvVars.length > 0) {
      return;
    }

    const controller = new AbortController();

    void Promise.all([
      fetchCategoryTree(controller.signal),
      fetchPublishedMemories({
        limit: 12,
        mainFeatured: true,
        signal: controller.signal,
      }),
      fetchPublishedMemories({
        limit: 1000,
        categoryFeatured: true,
        signal: controller.signal,
      }),
    ])
      .then(([loadedCategories, loadedMainFeatured, loadedCategoryFeatured]) => {
        const categoryId = new URL(window.location.href).searchParams.get(
          "category",
        );
        const nextSelectedCategoryId =
          categoryId &&
          loadedCategories.some((category) => category.id === categoryId)
            ? categoryId
            : null;

        startTransition(() => {
          setCategories(loadedCategories);
          setMainFeatured(loadedMainFeatured);
          setCategoryFeaturedMemories(loadedCategoryFeatured);
          setInitialSelectedCategoryId(nextSelectedCategoryId);
          setIsLoading(false);
        });
      })
      .catch((error) => {
        if (isAbortError(error)) {
          return;
        }

        console.error("Failed to load home exhibition data", error);
        setLoadError(
          "메인 전시 이미지를 불러오지 못했어요. Supabase 공개 읽기 권한과 환경변수를 확인해 주세요.",
        );
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [missingEnvVars]);

  return (
    <SiteShell
      currentPath="/"
      showHeader={false}
      showBackdrop={false}
      fullBleed
    >
      {missingEnvVars.length > 0 ? (
        <ConfigurationNotice missingKeys={missingEnvVars} />
      ) : loadError ? (
        <div className="event-panel-strong rounded-[28px] px-5 py-4 text-sm text-rose-800">
          {loadError}
        </div>
      ) : (
        <HomeScene>
          {isLoading ? (
            <div className="mx-auto w-full max-w-6xl rounded-[32px] bg-white/12 px-4 py-5 shadow-[0_18px_46px_rgba(0,0,0,0.22)] backdrop-blur-md sm:px-5">
              <div className="flex flex-wrap items-center justify-center gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-11 w-24 animate-pulse rounded-full bg-white/30"
                  />
                ))}
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-72 animate-pulse rounded-[28px] bg-white/18"
                  />
                ))}
              </div>
            </div>
          ) : (
            <HomeCategoryGallery
              categories={categories}
              categoryFeaturedMemories={categoryFeaturedMemories}
              initialSelectedCategoryId={initialSelectedCategoryId}
              mainFeatured={mainFeatured}
            />
          )}
        </HomeScene>
      )}
    </SiteShell>
  );
}
