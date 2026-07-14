import { NextResponse } from "next/server";
import { getMissingSupabasePublicEnv } from "@/lib/env";
import { getCategoryTree } from "@/lib/supabase/categories";

export const runtime = "nodejs";

export async function GET() {
  const missingEnvVars = getMissingSupabasePublicEnv();

  if (missingEnvVars.length > 0) {
    return NextResponse.json(
      {
        error: `필수 환경변수가 비어 있어요: ${missingEnvVars.join(", ")}`,
      },
      { status: 503 },
    );
  }

  try {
    const categories = await getCategoryTree();
    return NextResponse.json({ categories });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "카테고리를 불러오지 못했어요.",
      },
      { status: 500 },
    );
  }
}
