import { getMissingSupabasePublicEnv } from "@/lib/env";
import {
  getAttachmentContentDisposition,
  getMemoryDownloadFileName,
} from "@/lib/memory-downloads";
import { isPublicMemory } from "@/lib/memory-records";
import { getMemoryById } from "@/lib/supabase/memories";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const missingEnvVars = getMissingSupabasePublicEnv();

  if (missingEnvVars.length > 0) {
    return new Response(
      `필수 환경변수가 비어 있어요: ${missingEnvVars.join(", ")}`,
      { status: 503 },
    );
  }

  const { id } = await context.params;
  const memory = await getMemoryById(id);

  if (!memory || !isPublicMemory(memory)) {
    return new Response("이미지를 찾지 못했어요.", { status: 404 });
  }

  const response = await fetch(memory.imageUrl);

  if (!response.ok) {
    return new Response("이미지 파일을 불러오지 못했어요.", { status: 502 });
  }

  const contentType =
    response.headers.get("content-type") || "application/octet-stream";
  const fileName = getMemoryDownloadFileName(memory);

  return new Response(response.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": getAttachmentContentDisposition(fileName),
      "Cache-Control": "no-store",
    },
  });
}
