import { getDisplayAssetUrl, getMediaById } from "@/lib/data/media";
import { fail, ok } from "@/lib/http";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const media = await getMediaById(id);

    if (!media) {
      return fail("미디어를 찾을 수 없습니다.", 404);
    }

    return ok({
      media,
      displayAssetUrl: getDisplayAssetUrl(media),
    });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "미디어를 불러오지 못했습니다.",
      400,
    );
  }
}
