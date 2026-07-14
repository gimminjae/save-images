import { createCategory } from "@/lib/data/categories";
import { fail, ok } from "@/lib/http";
import { categoryCreateSchema } from "@/lib/validation/categories";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = categoryCreateSchema.parse(await request.json());
    const category = await createCategory(payload);
    return ok({ category }, { status: 201 });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "카테고리를 생성하지 못했습니다.",
      400,
    );
  }
}
