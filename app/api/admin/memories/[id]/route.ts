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
import { getCategoryById } from "@/lib/supabase/categories";
import {
  deleteMemory,
  getMemoryById,
  updateMemory,
} from "@/lib/supabase/memories";
import {
  getImageExtension,
  validateImageUploadInput,
  validateUpdateMemoryInput,
} from "@/lib/validations/memory";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

export async function PATCH(request: Request, context: RouteContext) {
  const missingEnvVars = getMissingSupabasePublicEnv();

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
    const { id } = await context.params;
    const existingMemory = await getMemoryById(id);

    if (!existingMemory) {
      return NextResponse.json(
        {
          error: "수정할 데이터를 찾지 못했어요.",
        },
        { status: 404 },
      );
    }

    const requestContentType = request.headers.get("content-type") ?? "";
    let name: unknown = existingMemory.name;
    let nickname: unknown = existingMemory.nickname;
    let department: unknown = existingMemory.department;
    let description: unknown = existingMemory.description;
    let isVisible: unknown = existingMemory.isVisible;
    let categoryId: unknown = existingMemory.categoryId;
    let isCategoryFeatured: unknown = existingMemory.isCategoryFeatured;
    let isMainFeatured: unknown = existingMemory.isMainFeatured;
    let imageWidthValue: unknown;
    let imageHeightValue: unknown;
    let imagePayload:
      | {
          imageKey: string;
          imageUrl: string;
          imageWidth?: number;
          imageHeight?: number;
        }
      | undefined;

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

      name = payload.name ?? name;
      nickname = payload.nickname ?? nickname;
      department = payload.department ?? department;
      description = payload.description ?? description;
      isVisible = payload.isVisible ?? isVisible;
      categoryId = payload.categoryId ?? categoryId;
      isCategoryFeatured = payload.isCategoryFeatured ?? isCategoryFeatured;
      isMainFeatured = payload.isMainFeatured ?? isMainFeatured;
      imageWidthValue = payload.imageWidth;
      imageHeightValue = payload.imageHeight;

      if (uploadToken) {
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

        imagePayload = {
          imageUrl: expectedImageUrl,
          imageKey: verifiedUpload.fileKey,
          imageWidth: readNumber(imageWidthValue),
          imageHeight: readNumber(imageHeightValue),
        };
      } else if (payload.imageKey !== undefined || payload.imageUrl !== undefined) {
        return NextResponse.json(
          {
            error: "새 이미지를 저장하려면 업로드를 다시 시작해 주세요.",
          },
          { status: 400 },
        );
      }
    } else {
      const formData = await request.formData();
      const file = formData.get("image");

      name = formData.get("name");
      nickname = formData.get("nickname");
      department = formData.get("department");
      description = formData.get("description");
      isVisible = formData.get("isVisible");
      categoryId = formData.get("categoryId");
      isCategoryFeatured = formData.get("isCategoryFeatured");
      isMainFeatured = formData.get("isMainFeatured");
      imageWidthValue = formData.get("imageWidth");
      imageHeightValue = formData.get("imageHeight");

      if (file instanceof File && file.size > 0) {
        const missingStorageEnv = getMissingStorageEnv();

        if (missingStorageEnv.length > 0) {
          return NextResponse.json(
            {
              error: `필수 환경변수가 비어 있어요: ${missingStorageEnv.join(", ")}`,
            },
            { status: 503 },
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

        imagePayload = {
          imageUrl: publicUrl,
          imageKey: fileKey,
          imageWidth: readNumber(imageWidthValue),
          imageHeight: readNumber(imageHeightValue),
        };
      }
    }

    const nextCategoryId =
      typeof categoryId === "string" && categoryId.trim().length > 0
        ? categoryId
        : existingMemory.categoryId;

    if (!nextCategoryId) {
      return NextResponse.json(
        {
          error: "카테고리를 선택해 주세요.",
        },
        { status: 400 },
      );
    }

    await assertCategoryExists(nextCategoryId);

    const payload = validateUpdateMemoryInput({
      name: typeof name === "string" ? name : existingMemory.name,
      nickname: typeof nickname === "string" ? nickname : existingMemory.nickname,
      department: typeof department === "string" ? department : existingMemory.department,
      description: typeof description === "string" ? description : existingMemory.description,
      categoryId: nextCategoryId,
      isVisible:
        typeof isVisible === "string"
          ? isVisible
          : String(existingMemory.isVisible),
      isCategoryFeatured:
        typeof isCategoryFeatured === "string"
          ? isCategoryFeatured
          : String(existingMemory.isCategoryFeatured),
      isMainFeatured:
        typeof isMainFeatured === "string"
          ? isMainFeatured
          : String(existingMemory.isMainFeatured),
      ...(imagePayload ?? {}),
    });

    const memory = await updateMemory(id, payload);
    uploadedFileKey = null;

    if (imagePayload && existingMemory.imageKey !== imagePayload.imageKey) {
      try {
        await deleteMemoryObject(existingMemory.imageKey);
      } catch (error) {
        console.error("Failed to delete replaced memory image", {
          id,
          imageKey: existingMemory.imageKey,
          error,
        });
      }
    }

    return NextResponse.json({ memory });
  } catch (error) {
    if (uploadedFileKey) {
      try {
        await deleteMemoryObject(uploadedFileKey);
      } catch (cleanupError) {
        console.error("Failed to rollback uploaded replacement image", {
          imageKey: uploadedFileKey,
          cleanupError,
        });
      }
    }

    if (typeof error === "object" && error) {
      console.error("Failed to update memory", error);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "이미지 수정에 실패했어요.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
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
    const { id } = await context.params;
    const existingMemory = await getMemoryById(id);

    if (!existingMemory) {
      return NextResponse.json(
        {
          error: "삭제할 데이터를 찾지 못했어요.",
        },
        { status: 404 },
      );
    }

    await deleteMemory(id);

    let warning: string | undefined;

    try {
      await deleteMemoryObject(existingMemory.imageKey);
    } catch (error) {
      warning = "이미지 파일 정리 중 문제가 있었지만 데이터는 삭제했어요.";
      console.error("Failed to delete memory image", {
        id,
        imageKey: existingMemory.imageKey,
        error,
      });
    }

    return NextResponse.json({ success: true, warning });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "이미지 삭제에 실패했어요.",
      },
      { status: 400 },
    );
  }
}
