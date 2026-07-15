import { NextResponse } from "next/server";
import { getMissingStorageEnv } from "@/lib/env";
import { listPublicImageObjectsByPrefix } from "@/lib/aws/s3";
import type { MemoryRecord } from "@/types/memory";

export const runtime = "nodejs";

const MAIN_GALLERY_PREFIX = "hanmong/hanmong16main/";
const MAIN_GALLERY_HEADERS = {
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
};

function mapS3ImageToMemoryRecord(image: {
  key: string;
  lastModified: number;
  name: string;
  url: string;
}): MemoryRecord {
  return {
    id: `s3-main:${image.key}`,
    name: image.name,
    nickname: image.name,
    department: "",
    description: "",
    imageUrl: image.url,
    imageKey: image.key,
    categoryId: null,
    category: null,
    createdAt: image.lastModified,
    updatedAt: image.lastModified,
    status: "published",
    isVisible: true,
    isCategoryFeatured: false,
    isMainFeatured: true,
    thumbnailUrl: image.url,
    downloadUrl: image.url,
  };
}

export async function GET() {
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
    const images = await listPublicImageObjectsByPrefix(MAIN_GALLERY_PREFIX);
    const memories = images
      .sort((first, second) => second.lastModified - first.lastModified)
      .map(mapS3ImageToMemoryRecord);

    return NextResponse.json(
      { memories },
      { headers: MAIN_GALLERY_HEADERS },
    );
  } catch (error) {
    console.error("Failed to list main gallery images from S3", error);

    return NextResponse.json(
      {
        error: "메인 전시 이미지를 S3에서 불러오지 못했어요.",
      },
      { status: 500 },
    );
  }
}
