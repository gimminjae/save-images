import { NextResponse } from "next/server";
import {
  createMemoryObjectKey,
  deleteMemoryObject,
  uploadMemoryObject,
} from "@/lib/aws/s3";
import {
  getMissingSupabasePublicEnv,
  getMissingStorageEnv,
} from "@/lib/env";
import { getCategoryById } from "@/lib/supabase/categories";
import { createMemory, listPublishedMemories } from "@/lib/supabase/memories";
import { getFileStemName } from "@/lib/utils";
import {
  getImageExtension,
  validateCreateMemoryInput,
  validateImageUploadInput,
} from "@/lib/validations/memory";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const missingEnvVars = getMissingSupabasePublicEnv();

  if (missingEnvVars.length > 0) {
    return NextResponse.json(
      {
        error: `필수 환경변수가 비어 있어요: ${missingEnvVars.join(", ")}`,
      },
      { status: 503 },
    );
  }

  try {
    const url = new URL(request.url);
    const limitValue = Number(url.searchParams.get("limit") ?? "500");
    const limit =
      Number.isFinite(limitValue) && limitValue > 0
        ? Math.min(limitValue, 500)
        : 500;

    const memories = await listPublishedMemories(limit);
    return NextResponse.json({ memories });
  } catch (error) {
    console.error("Failed to list memories", error);

    return NextResponse.json(
      {
        error: "이미지 목록을 불러오지 못했어요.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const missingEnvVars = [
    ...getMissingSupabasePublicEnv(),
    ...getMissingStorageEnv(),
  ];

  if (missingEnvVars.length > 0) {
    return NextResponse.json(
      {
        error: `필수 환경변수가 비어 있어요: ${missingEnvVars.join(", ")}`,
      },
      { status: 503 },
    );
  }

  let uploadedFileKey: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("image");
    const nickname = formData.get("nickname");
    const department = formData.get("department");
    const description = formData.get("description");
    const rawName = formData.get("name");
    const categoryId = formData.get("categoryId");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "이미지 파일을 첨부해 주세요.",
        },
        { status: 400 },
      );
    }

    if (typeof categoryId !== "string" || categoryId.trim().length === 0) {
      return NextResponse.json(
        {
          error: "카테고리를 선택해 주세요.",
        },
        { status: 400 },
      );
    }

    if (!(await getCategoryById(categoryId))) {
      return NextResponse.json(
        {
          error: "선택한 카테고리를 찾지 못했어요.",
        },
        { status: 404 },
      );
    }

    const validatedFile = validateImageUploadInput({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
    const extension = getImageExtension(validatedFile.fileType);

    if (!extension) {
      return NextResponse.json(
        {
          error: "지원하지 않는 이미지 형식입니다.",
        },
        { status: 400 },
      );
    }

    const fileKey = createMemoryObjectKey(extension, validatedFile.fileName);
    uploadedFileKey = fileKey;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { publicUrl } = await uploadMemoryObject({
      fileKey,
      contentType: validatedFile.fileType,
      body: buffer,
    });

    const imageWidthValue = formData.get("imageWidth");
    const imageHeightValue = formData.get("imageHeight");
    const name =
      typeof rawName === "string" && rawName.trim().length > 0
        ? rawName
        : getFileStemName(file.name);

    const payload = validateCreateMemoryInput({
      name,
      nickname,
      department,
      description,
      imageUrl: publicUrl,
      imageKey: fileKey,
      categoryId,
      imageWidth:
        typeof imageWidthValue === "string" ? Number(imageWidthValue) : undefined,
      imageHeight:
        typeof imageHeightValue === "string"
          ? Number(imageHeightValue)
          : undefined,
    });
    const memory = await createMemory(payload);

    return NextResponse.json({ memory }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "이미지 저장에 실패했어요.";

    if (uploadedFileKey) {
      try {
        await deleteMemoryObject(uploadedFileKey);
      } catch (cleanupError) {
        console.error("Failed to rollback uploaded memory image", {
          imageKey: uploadedFileKey,
          cleanupError,
        });
      }
    }

    return NextResponse.json(
      {
        error: message,
      },
      { status: 400 },
    );
  }
}
