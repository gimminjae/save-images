import { cancelUploadSession } from "@/lib/data/media";
import { fail, ok } from "@/lib/http";
import { cancelUploadSchema } from "@/lib/validation/uploads";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = cancelUploadSchema.parse(await request.json());
    await cancelUploadSession(payload.uploadSessionId);
    return ok({ success: true });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "업로드 세션을 취소하지 못했습니다.",
      400,
    );
  }
}
