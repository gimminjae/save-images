"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { DownloadManager } from "@/components/download-manager";
import { EventSceneBackdrop } from "@/components/event-scene-backdrop";
import { fetchPublishedMemories, isAbortError } from "@/lib/api-client";
import { getMissingSupabasePublicEnv } from "@/lib/env";
import type { MemoryRecord } from "@/types/memory";

export default function DownloadPage() {
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

        console.error("Failed to load downloadable memories", error);
        setLoadError("다운로드할 이미지를 불러오지 못했어요.");
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [missingEnvVars]);

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-4 sm:px-6 sm:py-6">
      <EventSceneBackdrop />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        {missingEnvVars.length > 0 ? (
          <ConfigurationNotice missingKeys={missingEnvVars} />
        ) : loadError ? (
          <div className="event-panel-strong rounded-[28px] px-5 py-4 text-sm text-rose-800">
            {loadError}
          </div>
        ) : isLoading ? (
          <section className="event-panel rounded-[32px] px-4 py-5 sm:rounded-[36px] sm:px-6 sm:py-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-3">
                <div className="h-5 w-24 animate-pulse rounded-full bg-white/70" />
                <div className="h-10 w-48 animate-pulse rounded-full bg-white/75" />
                <div className="h-5 w-80 animate-pulse rounded-full bg-white/65" />
              </div>
              <div className="flex gap-2">
                <div className="h-11 w-24 animate-pulse rounded-full bg-white/70" />
                <div className="h-11 w-40 animate-pulse rounded-full bg-white/70" />
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-80 animate-pulse rounded-[28px] bg-white/70"
                />
              ))}
            </div>
          </section>
        ) : (
          <DownloadManager memories={memories} />
        )}
      </div>
    </main>
  );
}
