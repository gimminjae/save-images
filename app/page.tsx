"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { ConfigurationNotice } from "@/components/configuration-notice";
import Galaxy from "@/components/galaxy";
import { HomeCategoryGallery } from "@/components/home-category-gallery";
import { HomeMemoryOrbit } from "@/components/home-memory-orbit";
import { SiteShell } from "@/components/site-shell";
import {
  fetchMainGalleryMemories,
  isAbortError,
} from "@/lib/api-client";
import { getMissingStorageEnv } from "@/lib/env";
import type { MemoryRecord } from "@/types/memory";

function HomeScene({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative min-h-[100svh] overflow-hidden px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[#02030a]">
        <Galaxy
          className="absolute inset-0"
          mouseRepulsion={false}
          mouseInteraction={false}
          density={1}
          glowIntensity={0.3}
          saturation={0}
          hueShift={140}
          twinkleIntensity={0.3}
          rotationSpeed={0.05}
          repulsionStrength={2}
          autoCenterRepulsion={0}
          starSpeed={0.5}
          speed={1}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1860px] items-center justify-center">
        {children}
      </div>
    </section>
  );
}

export default function Home() {
  const missingEnvVars = useMemo(() => getMissingStorageEnv(), []);
  const [mainFeatured, setMainFeatured] = useState<MemoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(missingEnvVars.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (missingEnvVars.length > 0) {
      return;
    }

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
          "메인 전시 이미지를 S3에서 불러오지 못했어요. 스토리지 환경변수를 확인해 주세요.",
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
