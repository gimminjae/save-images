import { ConfigurationNotice } from "@/components/configuration-notice";
import { DisplaySlideshow } from "@/components/display-slideshow";
import { getMissingSupabasePublicEnv } from "@/lib/env";
import { listPublishedMemories } from "@/lib/supabase/memories";
import type { MemoryRecord } from "@/types/memory";

export const dynamic = "force-dynamic";

export default async function DisplayPage() {
  const missingEnvVars = getMissingSupabasePublicEnv();
  let memories: MemoryRecord[] = [];
  let loadError: string | null = null;

  if (missingEnvVars.length === 0) {
    try {
      memories = await listPublishedMemories(500);
    } catch (error) {
      console.error("Failed to load display memories", error);
      loadError = "전시 이미지를 불러오지 못했어요.";
    }
  }

  if (missingEnvVars.length > 0) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <ConfigurationNotice missingKeys={missingEnvVars} />
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-white">
        <div className="max-w-xl rounded-[32px] border border-white/15 bg-white/8 px-8 py-10 text-center backdrop-blur-md">
          <h1 className="text-3xl font-black tracking-[-0.05em]">
            전시 화면을 시작하지 못했어요
          </h1>
          <p className="mt-4 text-lg text-white/80">{loadError}</p>
        </div>
      </main>
    );
  }

  return <DisplaySlideshow initialMemories={memories} />;
}
