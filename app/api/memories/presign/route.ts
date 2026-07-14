import { NextResponse } from "next/server";
import { getMissingStorageEnv } from "@/lib/env";
import { createMemoryUploadReservation } from "@/lib/uploads/presign";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const missingEnvVars = getMissingStorageEnv();

  if (missingEnvVars.length > 0) {
    return NextResponse.json(
      {
        error: `필수 환경변수가 비어 있어요: ${missingEnvVars.join(", ")}`,
      },
      { status: 503 },
    );
  }

  try {
    const reservation = await createMemoryUploadReservation(await request.json());
    return NextResponse.json(reservation);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "업로드 준비를 시작하지 못했어요.",
      },
      { status: 400 },
    );
  }
}
