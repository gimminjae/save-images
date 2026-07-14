import { finalizeUploadSession } from "@/lib/data/media";
import { isRuntimeConfigured } from "@/lib/env";
import { fail, ok } from "@/lib/http";
import { completeUploadSchema } from "@/lib/validation/uploads";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isRuntimeConfigured()) {
    return fail("Supabase 또는 AWS S3 환경 변수가 아직 설정되지 않았습니다.", 503);
  }

  try {
    const payload = completeUploadSchema.parse(await request.json());
    await finalizeUploadSession(payload);
    return ok({ success: true });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "업로드 완료 처리를 실패했습니다.",
      400,
    );
  }
}
