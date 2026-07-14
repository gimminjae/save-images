import { z } from "zod";

import { createDownloadLink } from "@/lib/data/media";
import { fail, ok } from "@/lib/http";

const downloadSchema = z.object({
  mediaId: z.string().min(1),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = downloadSchema.parse(await request.json());
    const url = await createDownloadLink(payload.mediaId);
    return ok({ url });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "다운로드 링크를 만들지 못했습니다.",
      400,
    );
  }
}
