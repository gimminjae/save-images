"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { DisplaySlideshow } from "@/components/display-slideshow";
import { EventSceneBackdrop } from "@/components/event-scene-backdrop";
import { fetchPublishedMemories, isAbortError } from "@/lib/api-client";
import { getMissingSupabasePublicEnv } from "@/lib/env";
import type { MemoryRecord } from "@/types/memory";

export default function DisplayPage() {
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

        console.error("Failed to load display memories", error);
        setLoadError("전시 이미지를 불러오지 못했어요.");
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [missingEnvVars]);

  if (missingEnvVars.length > 0) {
    return (
      <main className="relative min-h-screen overflow-hidden px-6 py-10">
        <EventSceneBackdrop />
        <div className="relative z-10 mx-auto max-w-3xl">
          <ConfigurationNotice missingKeys={missingEnvVars} />
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10 text-white">
        <EventSceneBackdrop />
        <div className="relative z-10 max-w-xl rounded-[32px] border border-white/15 bg-black/28 px-8 py-10 text-center backdrop-blur-md">
          <h1 className="text-3xl font-black tracking-[-0.05em]">
            전시 화면을 시작하지 못했어요
          </h1>
          <p className="mt-4 text-lg text-white/80">{loadError}</p>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10 text-white">
        <EventSceneBackdrop />
        <div className="relative z-10 w-full max-w-5xl rounded-[36px] border border-white/12 bg-black/22 px-6 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.26)] backdrop-blur-md sm:px-8 sm:py-8">
          <div className="flex items-center justify-between gap-3">
            <div className="h-10 w-36 animate-pulse rounded-full bg-white/20" />
            <div className="h-10 w-24 animate-pulse rounded-full bg-white/15" />
          </div>
          <div className="mt-6 h-[62vh] animate-pulse rounded-[30px] bg-white/12" />
          <div className="mt-6 h-28 animate-pulse rounded-[28px] bg-white/12" />
        </div>
      </main>
    );
  }

  return <DisplaySlideshow initialMemories={memories} />;
}
