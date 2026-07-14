import { deleteCategory, updateCategory } from "@/lib/data/categories";
import { fail, ok } from "@/lib/http";
import { categoryUpdateSchema } from "@/lib/validation/categories";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payload = categoryUpdateSchema.parse(await request.json());
    const category = await updateCategory(id, payload);
    return ok({ category });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "카테고리를 수정하지 못했습니다.",
      400,
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await deleteCategory(id);
    return ok(result);
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "카테고리를 삭제하지 못했습니다.",
      400,
    );
  }
}
