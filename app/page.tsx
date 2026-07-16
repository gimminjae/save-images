"use client";

import { startTransition, useEffect, useState } from "react";
import { HomeCategoryGallery } from "@/components/home-category-gallery";
import { HomeGalaxyBackdrop } from "@/components/home-galaxy-backdrop";
import { HomeMemoryOrbit } from "@/components/home-memory-orbit";
import { SiteShell } from "@/components/site-shell";
import {
  fetchMainGalleryMemories,
  isAbortError,
} from "@/lib/api-client";
import type { MemoryRecord } from "@/types/memory";

function HomeScene({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6">
      <HomeGalaxyBackdrop />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1860px] items-center justify-center">
        {children}
      </div>
    </section>
  );
}

export default function Home() {
  const [mainFeatured, setMainFeatured] = useState<MemoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void fetchMainGalleryMemories(controller.signal)
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
          "메인 전시 이미지를 public/images 에서 불러오지 못했어요.",
        );
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <SiteShell
      currentPath="/"
      showBackdrop={false}
      fullBleed
    >
      {loadError ? (
        <div className="event-panel-strong rounded-[28px] px-5 py-4 text-sm text-rose-800">
          {loadError}
        </div>
      ) : (
        <HomeScene>
          {isLoading ? (
            <HomeMemoryOrbit memories={[]} isLoading />
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
