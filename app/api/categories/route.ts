import { NextResponse } from "next/server";
import { getMissingSupabasePublicEnv } from "@/lib/env";
import { createCategory } from "@/lib/supabase/categories";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
    const payload = (await request.json()) as {
      name?: unknown;
      parentId?: unknown;
      sortOrder?: unknown;
    };

    const name =
      typeof payload.name === "string" ? payload.name.trim() : "";

    if (!name) {
      return NextResponse.json(
        {
          error: "카테고리 이름을 입력해 주세요.",
        },
        { status: 400 },
      );
    }

    const category = await createCategory({
      name,
      parentId:
        typeof payload.parentId === "string" && payload.parentId.trim()
          ? payload.parentId
          : null,
      sortOrder:
        typeof payload.sortOrder === "number" && Number.isFinite(payload.sortOrder)
          ? payload.sortOrder
          : 0,
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "카테고리를 생성하지 못했어요.",
      },
      { status: 400 },
    );
  }
}
