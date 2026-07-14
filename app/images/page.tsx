import { ConfigurationNotice } from "@/components/configuration-notice";
import { ImageManager } from "@/components/image-manager";
import { SiteShell } from "@/components/site-shell";
import { getMissingSupabasePublicEnv } from "@/lib/env";
import { getCategoryTree } from "@/lib/supabase/categories";
import { listAllMemories } from "@/lib/supabase/memories";

export const dynamic = "force-dynamic";

export default async function ImagesPage() {
  const missingEnvVars = getMissingSupabasePublicEnv();
  const [categories, memories] =
    missingEnvVars.length === 0
      ? await Promise.all([
          getCategoryTree(),
          listAllMemories({ limit: 500 }),
        ])
      : [[], []];

  return (
    <SiteShell currentPath="/images">
      {missingEnvVars.length > 0 ? (
        <ConfigurationNotice missingKeys={missingEnvVars} />
      ) : (
        <ImageManager categories={categories} initialMemories={memories} />
      )}
    </SiteShell>
  );
}
