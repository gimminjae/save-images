import { NextResponse } from "next/server";
import {
  createMemoryObjectKey,
  deleteMemoryObject,
  getPublicAssetUrl,
  uploadMemoryObject,
  verifyUploadToken,
} from "@/lib/aws/s3";
import {
  getMissingSupabasePublicEnv,
  getMissingStorageEnv,
} from "@/lib/env";
import {
  getCategoryById,
  getCategoryDescendantIds,
} from "@/lib/supabase/categories";
import {
  createMemory,
  listAllMemories,
} from "@/lib/supabase/memories";
import { getFileStemName } from "@/lib/utils";
import {
  getImageExtension,
  validateCreateMemoryInput,
  validateImageUploadInput,
} from "@/lib/validations/memory";

export const runtime = "nodejs";

function readNumber(value: FormDataEntryValue | unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

async function assertCategoryExists(categoryId: string) {
  if (!(await getCategoryById(categoryId))) {
    throw new Error("선택한 카테고리를 찾지 못했어요.");
  }
}

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
        ? Math.min(limitValue, 1000)
        : 500;
    const mainFeatured = url.searchParams.get("mainFeatured") === "true";
    const categoryFeatured =
      url.searchParams.get("categoryFeatured") === "true";
    const includeDescendants =
      url.searchParams.get("includeDescendants") !== "false";
    const categoryId = url.searchParams.get("categoryId")?.trim() ?? "";
    const categoryIds = categoryId
      ? includeDescendants
        ? await getCategoryDescendantIds(categoryId)
        : [categoryId]
      : undefined;

    const memories =
      mainFeatured || categoryFeatured
        ? await listAllMemories({
            limit,
            onlyVisible: true,
            onlyMainFeatured: mainFeatured,
            onlyCategoryFeatured: categoryFeatured,
            categoryIds,
          })
        : await listAllMemories({
            limit,
            onlyVisible: true,
            categoryIds,
          });
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
    const requestContentType = request.headers.get("content-type") ?? "";

    if (requestContentType.includes("application/json")) {
      const payload = (await request.json()) as {
        categoryId?: unknown;
        department?: unknown;
        description?: unknown;
        imageHeight?: unknown;
        imageKey?: unknown;
        imageUrl?: unknown;
        imageWidth?: unknown;
        isCategoryFeatured?: unknown;
        isMainFeatured?: unknown;
        isVisible?: unknown;
        name?: unknown;
        nickname?: unknown;
        uploadToken?: unknown;
      };
      const uploadToken =
        typeof payload.uploadToken === "string" ? payload.uploadToken : "";

      if (!uploadToken) {
        return NextResponse.json(
          {
            error: "업로드 인증 정보가 없어요. 다시 업로드를 시작해 주세요.",
          },
          { status: 400 },
        );
      }

      const verifiedUpload = verifyUploadToken(uploadToken);
      const expectedImageUrl = getPublicAssetUrl(verifiedUpload.fileKey);
      uploadedFileKey = verifiedUpload.fileKey;

      if (
        typeof payload.imageKey === "string" &&
        payload.imageKey !== verifiedUpload.fileKey
      ) {
        return NextResponse.json(
          {
            error: "업로드 이미지 정보가 일치하지 않아요.",
          },
          { status: 400 },
        );
      }

      if (
        typeof payload.imageUrl === "string" &&
        payload.imageUrl !== expectedImageUrl
      ) {
        return NextResponse.json(
          {
            error: "업로드 이미지 주소가 일치하지 않아요.",
          },
          { status: 400 },
        );
      }

      const categoryId =
        typeof payload.categoryId === "string" ? payload.categoryId.trim() : "";

      if (!categoryId) {
        return NextResponse.json(
          {
            error: "카테고리를 선택해 주세요.",
          },
          { status: 400 },
        );
      }

      await assertCategoryExists(categoryId);

      const memory = await createMemory(
        validateCreateMemoryInput({
          name: payload.name,
          nickname: payload.nickname,
          department: payload.department,
          description: payload.description,
          categoryId,
          imageUrl: expectedImageUrl,
          imageKey: verifiedUpload.fileKey,
          imageWidth: readNumber(payload.imageWidth),
          imageHeight: readNumber(payload.imageHeight),
          isVisible: payload.isVisible,
          isCategoryFeatured: payload.isCategoryFeatured,
          isMainFeatured: payload.isMainFeatured,
        }),
      );

      uploadedFileKey = null;
      return NextResponse.json({ memory }, { status: 201 });
    }

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

    await assertCategoryExists(categoryId);

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
      imageWidth: readNumber(imageWidthValue),
      imageHeight: readNumber(imageHeightValue),
    });
    const memory = await createMemory(payload);
    uploadedFileKey = null;

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
