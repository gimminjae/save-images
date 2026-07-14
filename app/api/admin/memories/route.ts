import { NextResponse } from "next/server";
import { getMissingSupabasePublicEnv } from "@/lib/env";
import { listAllMemories } from "@/lib/supabase/memories";

export const runtime = "nodejs";

export async function GET(request: Request) {
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
    const url = new URL(request.url);
    const limitValue = Number(url.searchParams.get("limit") ?? "500");
    const limit =
      Number.isFinite(limitValue) && limitValue > 0
        ? Math.min(limitValue, 1000)
        : 500;

    const memories = await listAllMemories({ limit });
    return NextResponse.json({ memories });
  } catch (error) {
    console.error("Failed to list admin memories", error);

    return NextResponse.json(
      {
        error: "관리용 이미지 목록을 불러오지 못했어요.",
      },
      { status: 500 },
    );
  }
}
