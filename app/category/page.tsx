import { CategoryManager } from "@/components/category-manager";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { SiteShell } from "@/components/site-shell";
import { getMissingSupabasePublicEnv } from "@/lib/env";
import { getCategoryTree } from "@/lib/supabase/categories";

export const dynamic = "force-dynamic";

export default async function CategoryPage() {
  const missingEnvVars = getMissingSupabasePublicEnv();
  const categories = missingEnvVars.length === 0 ? await getCategoryTree() : [];

  return (
    <SiteShell currentPath="/category">
      {missingEnvVars.length > 0 ? (
        <ConfigurationNotice missingKeys={missingEnvVars} />
      ) : (
        <CategoryManager initialCategories={categories} />
      )}
    </SiteShell>
  );
}
