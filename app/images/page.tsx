"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { ImageManager } from "@/components/image-manager";
import { SiteShell } from "@/components/site-shell";
import {
  fetchAdminMemories,
  fetchCategoryTree,
  isAbortError,
} from "@/lib/api-client";
import { getMissingSupabasePublicEnv } from "@/lib/env";
import type { CategoryRecord } from "@/types/category";
import type { MemoryRecord } from "@/types/memory";

export default function ImagesPage() {
  const missingEnvVars = useMemo(() => getMissingSupabasePublicEnv(), []);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(missingEnvVars.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (missingEnvVars.length > 0) {
      return;
    }

    const controller = new AbortController();

    void Promise.all([
      fetchCategoryTree(controller.signal),
      fetchAdminMemories({
        limit: 500,
        signal: controller.signal,
      }),
    ])
      .then(([loadedCategories, loadedMemories]) => {
        startTransition(() => {
          setCategories(loadedCategories);
          setMemories(loadedMemories);
          setIsLoading(false);
        });
      })
      .catch((error) => {
        if (isAbortError(error)) {
          return;
        }

        console.error("Failed to load image manager data", error);
        setLoadError("이미지 관리 데이터를 불러오지 못했어요.");
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [missingEnvVars]);

  return (
    <SiteShell currentPath="/images">
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
              <div className="h-10 w-44 animate-pulse rounded-full bg-white/75" />
              <div className="h-5 w-64 animate-pulse rounded-full bg-white/65" />
            </div>
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-10 w-24 animate-pulse rounded-full bg-white/70"
                />
              ))}
            </div>
          </div>
          <div className="mt-5 h-24 animate-pulse rounded-[24px] bg-white/65" />
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-[32rem] animate-pulse rounded-[28px] bg-white/70"
              />
            ))}
          </div>
        </section>
      ) : (
        <ImageManager categories={categories} initialMemories={memories} />
      )}
    </SiteShell>
  );
}
