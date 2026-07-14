import { fail, ok } from "@/lib/http";
import { listMedia } from "@/lib/data/media";
import { mediaListSchema } from "@/lib/validation/media";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = mediaListSchema.parse({
      categoryId: searchParams.get("categoryId") ?? undefined,
      mediaType: searchParams.get("mediaType") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
    });

    const media = await listMedia(filters);
    return ok({ media });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "미디어 목록을 불러오지 못했습니다.",
      400,
    );
  }
}
