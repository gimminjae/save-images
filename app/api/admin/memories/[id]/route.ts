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

    const formData = await request.formData();
    const file = formData.get("image");
    const name = formData.get("name");
    const nickname = formData.get("nickname");
    const department = formData.get("department");
    const description = formData.get("description");
    const isVisible = formData.get("isVisible");
    const categoryId = formData.get("categoryId");
    const isCategoryFeatured = formData.get("isCategoryFeatured");
    const isMainFeatured = formData.get("isMainFeatured");
    const imageWidthValue = formData.get("imageWidth");
    const imageHeightValue = formData.get("imageHeight");

    let imagePayload:
      | {
          imageUrl: string;
          imageKey: string;
          imageWidth?: number;
          imageHeight?: number;
        }
      | undefined;

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

    if (!(await getCategoryById(nextCategoryId))) {
      return NextResponse.json(
        {
          error: "선택한 카테고리를 찾지 못했어요.",
        },
        { status: 404 },
      );
    }

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
        imageWidth:
          typeof imageWidthValue === "string"
            ? Number(imageWidthValue)
            : undefined,
        imageHeight:
          typeof imageHeightValue === "string"
            ? Number(imageHeightValue)
            : undefined,
      };
    }

    const payload = validateUpdateMemoryInput({
      name: typeof name === "string" ? name : existingMemory.name,
      nickname:
        typeof nickname === "string" ? nickname : existingMemory.nickname,
      department:
        typeof department === "string" ? department : existingMemory.department,
      description:
        typeof description === "string"
          ? description
          : existingMemory.description,
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
