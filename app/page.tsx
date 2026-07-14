import { ConfigurationNotice } from "@/components/configuration-notice";
import { HomeCategoryGallery } from "@/components/home-category-gallery";
import { SiteShell } from "@/components/site-shell";
import { getMissingSupabasePublicEnv } from "@/lib/env";
import { getCategoryTree } from "@/lib/supabase/categories";
import {
  getMainFeaturedMemories,
  listAllMemories,
} from "@/lib/supabase/memories";
import type { CategoryRecord } from "@/types/category";
import type { MemoryRecord } from "@/types/memory";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<{
    category?: string;
  }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const missingEnvVars = getMissingSupabasePublicEnv();
  let mainFeatured: MemoryRecord[] = [];
  let categoryFeaturedMemories: MemoryRecord[] = [];
  let categories: CategoryRecord[] = [];
  let initialSelectedCategoryId: string | null = null;
  let loadError: string | null = null;

  if (missingEnvVars.length === 0) {
    try {
      const [loadedCategories, loadedMainFeatured, loadedCategoryFeatured] =
        await Promise.all([
          getCategoryTree(),
          getMainFeaturedMemories(12),
          listAllMemories({
            limit: 1000,
            onlyVisible: true,
            onlyCategoryFeatured: true,
          }),
        ]);

      categories = loadedCategories;
      mainFeatured = loadedMainFeatured;
      categoryFeaturedMemories = loadedCategoryFeatured;
      initialSelectedCategoryId =
        typeof resolvedSearchParams.category === "string" &&
        categories.some((category) => category.id === resolvedSearchParams.category)
          ? resolvedSearchParams.category
          : null;
    } catch (error) {
      console.error("Failed to load home exhibition data", error);
      loadError =
        "메인 전시 이미지를 불러오지 못했어요. Supabase 공개 읽기 권한과 환경변수를 확인해 주세요.";
    }
  }

  return (
    <SiteShell
      currentPath="/"
      showHeader={false}
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
        <section className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-8 sm:py-10">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[url('/main-page-background.jpg')] bg-cover bg-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,16,38,0.08)_0%,rgba(8,16,38,0.14)_28%,rgba(5,12,31,0.34)_56%,rgba(4,9,24,0.68)_82%,rgba(2,6,18,0.82)_100%)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_24%,rgba(0,0,0,0)_46%,rgba(3,8,24,0.24)_100%)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(180deg,rgba(112,244,255,0),rgba(112,244,255,0.12)_60%,rgba(146,255,205,0.16)_100%)]"
          />

          <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8">
            <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center pt-8 sm:pt-12">
              <div className="w-full text-center">
                <h1 className="text-[clamp(2.4rem,6vw,4.4rem)] font-black tracking-[-0.08em] text-white drop-shadow-[0_10px_35px_rgba(8,18,44,0.55)] sm:leading-[0.95]">
                  <span className="block text-white/92">제 16기</span>
                  <span className="mt-2 block text-[clamp(3.4rem,10vw,7.6rem)]">
                    한몽 청년수련회
                  </span>
                </h1>
              </div>
            </div>

            <HomeCategoryGallery
              categories={categories}
              categoryFeaturedMemories={categoryFeaturedMemories}
              initialSelectedCategoryId={initialSelectedCategoryId}
              mainFeatured={mainFeatured}
            />
          </div>
        </section>
      )}
    </SiteShell>
  );
}
