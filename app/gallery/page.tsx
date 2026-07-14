"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { ImageExhibitionGrid } from "@/components/image-exhibition-grid";
import { SiteShell } from "@/components/site-shell";
import { fetchPublishedMemories, isAbortError } from "@/lib/api-client";
import { getMissingSupabasePublicEnv } from "@/lib/env";
import type { MemoryRecord } from "@/types/memory";

export default function GalleryPage() {
  const missingEnvVars = useMemo(() => getMissingSupabasePublicEnv(), []);
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(missingEnvVars.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (missingEnvVars.length > 0) {
      return;
    }

    const controller = new AbortController();

    void fetchPublishedMemories({
      limit: 500,
      signal: controller.signal,
    })
      .then((loadedMemories) => {
        startTransition(() => {
          setMemories(loadedMemories);
          setIsLoading(false);
        });
      })
      .catch((error) => {
        if (isAbortError(error)) {
          return;
        }

        console.error("Failed to load memories", error);
        setLoadError("이미지 목록을 불러오지 못했어요.");
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [missingEnvVars]);

  return (
    <SiteShell currentPath="/gallery">
      {missingEnvVars.length > 0 ? (
        <ConfigurationNotice missingKeys={missingEnvVars} />
      ) : loadError ? (
        <div className="event-panel-strong rounded-[28px] px-5 py-4 text-sm text-rose-800">
          {loadError}
        </div>
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
          <div className="mt-5">
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-72 animate-pulse rounded-[28px] bg-white/70"
                  />
                ))}
              </div>
            ) : (
              <ImageExhibitionGrid
                memories={memories}
                emptyMessage="아직 공개된 이미지가 없습니다."
              />
            )}
          </div>
        </section>
      )}
    </SiteShell>
  );
}
