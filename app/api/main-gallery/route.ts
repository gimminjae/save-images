import path from "node:path";
import { readdir, stat } from "node:fs/promises";
import { NextResponse } from "next/server";
import type { MemoryRecord } from "@/types/memory";

export const runtime = "nodejs";

const PUBLIC_MAIN_GALLERY_DIRECTORY = path.join(
  process.cwd(),
  "public",
  "images",
);
const MAIN_GALLERY_HEADERS = {
  "Cache-Control": "no-store",
};
const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
]);

let mainGalleryCache:
  | {
      expiresAt: number;
      memories: MemoryRecord[];
    }
  | null = null;

function isSupportedMainGalleryImage(fileName: string) {
  return SUPPORTED_IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function mapPublicImageToMemoryRecord(image: {
  lastModified: number;
  name: string;
}): MemoryRecord {
  const imageUrl = `/images/${encodeURIComponent(image.name)}`;
  const imageKey = `public/images/${image.name}`;
  const imageName = image.name.replace(/\.[^.]+$/, "");

  return {
    id: `public-main:${image.name}`,
    name: imageName,
    nickname: imageName,
    department: "",
    description: "",
    imageUrl,
    imageKey,
    categoryId: null,
    category: null,
    createdAt: image.lastModified,
    updatedAt: image.lastModified,
    status: "published",
    isVisible: true,
    isCategoryFeatured: false,
    isMainFeatured: true,
    thumbnailUrl: imageUrl,
    downloadUrl: imageUrl,
  };
}

export async function GET() {
  if (mainGalleryCache && mainGalleryCache.expiresAt > Date.now()) {
    return NextResponse.json(
      { memories: mainGalleryCache.memories },
      { headers: MAIN_GALLERY_HEADERS },
    );
  }

  try {
    /*
     * 기존에는 S3의 hanmong/hanmong16main/ prefix를 조회했지만,
     * 메인 페이지는 이제 public/images 정적 파일만 사용한다.
     */
    const directoryEntries = await readdir(PUBLIC_MAIN_GALLERY_DIRECTORY, {
      withFileTypes: true,
    });
    const imageFiles = directoryEntries.filter(
      (entry) =>
        entry.isFile() && isSupportedMainGalleryImage(entry.name),
    );
    const images = await Promise.all(
      imageFiles.map(async (entry) => {
        const filePath = path.join(PUBLIC_MAIN_GALLERY_DIRECTORY, entry.name);
        const fileStat = await stat(filePath);

        return {
          lastModified: Math.round(fileStat.mtimeMs),
          name: entry.name,
        };
      }),
    );
    const memories = images
      .sort((first, second) => second.lastModified - first.lastModified)
      .map(mapPublicImageToMemoryRecord);

    mainGalleryCache = {
      expiresAt: Date.now() + 60 * 1000,
      memories,
    };

    return NextResponse.json(
      { memories },
      { headers: MAIN_GALLERY_HEADERS },
    );
  } catch (error) {
    console.error("Failed to list main gallery images from public/images", error);

    return NextResponse.json(
      {
        error: "메인 전시 이미지를 public/images 에서 불러오지 못했어요.",
      },
      { status: 500 },
    );
  }
}
