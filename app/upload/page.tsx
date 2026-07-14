"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { ImageUploadConsole } from "@/components/image-upload-console";
import { SiteShell } from "@/components/site-shell";
import { fetchCategoryTree, isAbortError } from "@/lib/api-client";
import { getMissingServerEnv } from "@/lib/env";
import type { CategoryRecord } from "@/types/category";

export default function UploadPage() {
  const missingEnvVars = useMemo(() => getMissingServerEnv(), []);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(missingEnvVars.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (missingEnvVars.length > 0) {
      return;
    }

    const controller = new AbortController();

    void fetchCategoryTree(controller.signal)
      .then((loadedCategories) => {
        startTransition(() => {
          setCategories(loadedCategories);
          setIsLoading(false);
        });
      })
      .catch((error) => {
        if (isAbortError(error)) {
          return;
        }

        console.error("Failed to load upload categories", error);
        setLoadError("업로드용 카테고리를 불러오지 못했어요.");
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [missingEnvVars]);

  return (
    <SiteShell currentPath="/upload">
      {missingEnvVars.length > 0 ? (
        <ConfigurationNotice missingKeys={missingEnvVars} />
      ) : loadError ? (
        <div className="event-panel-strong rounded-[28px] px-5 py-4 text-sm text-rose-800">
          {loadError}
        </div>
      ) : isLoading ? (
        <section className="event-panel rounded-[32px] px-4 py-5 sm:rounded-[36px] sm:px-6 sm:py-7">
          <div className="h-10 w-48 animate-pulse rounded-full bg-white/75" />
          <div className="mt-5 h-32 animate-pulse rounded-[26px] bg-white/65" />
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="h-80 animate-pulse rounded-[28px] bg-white/70"
              />
            ))}
          </div>
        </section>
      ) : (
        <ImageUploadConsole categories={categories} />
      )}
    </SiteShell>
  );
}
