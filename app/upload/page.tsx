import { ConfigurationNotice } from "@/components/configuration-notice";
import { ImageUploadConsole } from "@/components/image-upload-console";
import { SiteShell } from "@/components/site-shell";
import { getMissingServerEnv } from "@/lib/env";
import { getCategoryTree } from "@/lib/supabase/categories";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const missingEnvVars = getMissingServerEnv();
  const categories = missingEnvVars.length === 0 ? await getCategoryTree() : [];

  return (
    <SiteShell currentPath="/upload">
      {missingEnvVars.length > 0 ? (
        <ConfigurationNotice missingKeys={missingEnvVars} />
      ) : (
        <ImageUploadConsole categories={categories} />
      )}
    </SiteShell>
  );
}
