import { ok, fail } from "@/lib/http";
import { getCategoryTree } from "@/lib/data/categories";

export async function GET() {
  try {
    const categories = await getCategoryTree();
    return ok({ categories });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "카테고리 목록을 불러오지 못했습니다.",
      500,
    );
  }
}
