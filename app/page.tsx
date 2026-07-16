"use client";

import { HomeCategoryGallery } from "@/components/home-category-gallery";
import { HomeGalaxyBackdrop } from "@/components/home-galaxy-backdrop";
import { SiteShell } from "@/components/site-shell";
import {
  getMainGalleryMemories,
} from "@/lib/api-client";

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
  const mainFeatured = getMainGalleryMemories();

  return (
    <SiteShell
      currentPath="/"
      showBackdrop={false}
      fullBleed
    >
      <HomeScene>
        <HomeCategoryGallery
          mainFeatured={mainFeatured}
        />
      </HomeScene>
    </SiteShell>
  );
}
