import { ConfigurationNotice } from "@/components/configuration-notice";
import { ImageExhibitionGrid } from "@/components/image-exhibition-grid";
import { SiteShell } from "@/components/site-shell";
import { getMissingSupabasePublicEnv } from "@/lib/env";
import { listPublishedMemories } from "@/lib/supabase/memories";
import type { MemoryRecord } from "@/types/memory";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const missingEnvVars = getMissingSupabasePublicEnv();
  let memories: MemoryRecord[] = [];
  let loadError: string | null = null;

  if (missingEnvVars.length === 0) {
    try {
      memories = await listPublishedMemories();
    } catch (error) {
      console.error("Failed to load memories", error);
      loadError = "이미지 목록을 불러오지 못했어요.";
    }
  }

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
            <ImageExhibitionGrid
              memories={memories}
              emptyMessage="아직 공개된 이미지가 없습니다."
            />
          </div>
        </section>
      )}
    </SiteShell>
  );
}
