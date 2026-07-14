import { fail, ok } from "@/lib/http";
import { softDeleteMedia, updateMedia } from "@/lib/data/media";
import { mediaUpdateSchema } from "@/lib/validation/media";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payload = mediaUpdateSchema.parse(await request.json());
    const media = await updateMedia(id, payload);
    return ok({ media });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "미디어를 수정하지 못했습니다.",
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
    const result = await softDeleteMedia(id);
    return ok(result);
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "미디어를 삭제하지 못했습니다.",
      400,
    );
  }
}
