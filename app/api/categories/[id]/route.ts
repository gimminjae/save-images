import { NextResponse } from "next/server";
import { getMissingSupabasePublicEnv } from "@/lib/env";
import { deleteCategory, updateCategory } from "@/lib/supabase/categories";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
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
    const { id } = await context.params;
    const payload = (await request.json()) as {
      name?: unknown;
      parentId?: unknown;
      sortOrder?: unknown;
    };

    const updates = {
      ...(typeof payload.name === "string" ? { name: payload.name.trim() } : {}),
      ...(payload.parentId === null
        ? { parentId: null }
        : typeof payload.parentId === "string"
          ? { parentId: payload.parentId.trim() || null }
          : {}),
      ...(typeof payload.sortOrder === "number" && Number.isFinite(payload.sortOrder)
        ? { sortOrder: payload.sortOrder }
        : {}),
    };

    const category = await updateCategory(id, updates);

    return NextResponse.json({ category });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "카테고리를 수정하지 못했어요.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
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
    const { id } = await context.params;
    const result = await deleteCategory(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "카테고리를 삭제하지 못했어요.",
      },
      { status: 400 },
    );
  }
}
