"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { EventSceneBackdrop } from "@/components/event-scene-backdrop";
import { HomeCategoryGallery } from "@/components/home-category-gallery";
import { SiteShell } from "@/components/site-shell";
import {
  fetchPublishedMemories,
  isAbortError,
} from "@/lib/api-client";
import { getMissingSupabasePublicEnv } from "@/lib/env";
import type { MemoryRecord } from "@/types/memory";

function HomeScene({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative min-h-[100svh] overflow-hidden px-3 py-6 sm:px-8 sm:py-10">
      <EventSceneBackdrop />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1760px] flex-col gap-6 sm:gap-8">
        <div className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center pt-3 sm:max-w-6xl sm:pt-12">
          <div className="w-full text-center">
            <h1 className="text-[clamp(1.9rem,8vw,4.4rem)] font-black tracking-[-0.08em] text-white drop-shadow-[0_10px_35px_rgba(8,18,44,0.55)] sm:leading-[0.95]">
              <span className="block text-white/92">제 16기</span>
              <span className="mt-2 block text-[clamp(2.75rem,12vw,7.6rem)] leading-[0.98]">
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
  const [mainFeatured, setMainFeatured] = useState<MemoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(missingEnvVars.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (missingEnvVars.length > 0) {
      return;
    }

    const controller = new AbortController();

    void fetchPublishedMemories({
      limit: 12,
      mainFeatured: true,
      signal: controller.signal,
    })
      .then((loadedMainFeatured) => {
        startTransition(() => {
          setMainFeatured(loadedMainFeatured);
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
            <div className="mx-auto w-full max-w-6xl rounded-[28px] bg-white/12 px-3 py-4 shadow-[0_18px_46px_rgba(0,0,0,0.22)] backdrop-blur-md sm:rounded-[32px] sm:px-5 sm:py-5">
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
              mainFeatured={mainFeatured}
            />
          )}
        </HomeScene>
      )}
    </SiteShell>
  );
}
