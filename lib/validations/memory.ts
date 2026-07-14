import type { CreateMemoryInput, UpdateMemoryInput } from "@/types/memory";
import { isMemoryObjectKey } from "@/lib/memories/shared";

export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_NAME_LENGTH = 80;
export const MAX_NICKNAME_LENGTH = 32;
export const MAX_DEPARTMENT_LENGTH = 32;
export const MAX_DESCRIPTION_LENGTH = 280;
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const IMAGE_EXTENSION_BY_TYPE: Record<(typeof ACCEPTED_IMAGE_TYPES)[number], string> =
  {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

type ImageUploadInput = {
  fileName: string;
  fileSize: number;
  fileType: string;
};

function collapseSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeDescription(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" ? collapseSpaces(value) : "";
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function getImageExtension(fileType: string) {
  return IMAGE_EXTENSION_BY_TYPE[fileType as keyof typeof IMAGE_EXTENSION_BY_TYPE] ?? null;
}

export function validateImageUploadInput(input: unknown): ImageUploadInput {
  assert(input && typeof input === "object", "잘못된 업로드 요청입니다.");

  const payload = input as Partial<ImageUploadInput>;

  assert(
    typeof payload.fileName === "string" && payload.fileName.trim().length > 0,
    "파일 이름이 비어 있어요.",
  );
  assert(
    typeof payload.fileType === "string" &&
      ACCEPTED_IMAGE_TYPES.includes(
        payload.fileType as (typeof ACCEPTED_IMAGE_TYPES)[number],
      ),
    "JPG, PNG, WEBP 파일만 업로드할 수 있어요.",
  );
  assert(
    typeof payload.fileSize === "number" &&
      Number.isFinite(payload.fileSize) &&
      payload.fileSize > 0,
    "파일 크기 정보가 올바르지 않아요.",
  );
  assert(
    payload.fileSize <= MAX_IMAGE_FILE_SIZE,
    `이미지는 ${Math.floor(MAX_IMAGE_FILE_SIZE / (1024 * 1024))}MB 이하로 업로드해 주세요.`,
  );

  return {
    fileName: payload.fileName.trim(),
    fileType: payload.fileType,
    fileSize: payload.fileSize,
  };
}

export function validateCreateMemoryInput(input: unknown): CreateMemoryInput {
  assert(input && typeof input === "object", "잘못된 이미지 등록 요청입니다.");

  const payload = input as Partial<CreateMemoryInput>;
  const name = collapseSpaces(typeof payload.name === "string" ? payload.name : "");
  const nickname = normalizeOptionalText(payload.nickname) || name;
  const department = normalizeOptionalText(payload.department);
  const description = normalizeDescription(
    typeof payload.description === "string" ? payload.description : "",
  );

  assert(name.length >= 1, "이름을 입력해 주세요.");
  assert(
    name.length <= MAX_NAME_LENGTH,
    `이름은 ${MAX_NAME_LENGTH}자 이하로 입력해 주세요.`,
  );
  assert(nickname.length <= MAX_NICKNAME_LENGTH, "이름이 너무 길어요.");
  assert(
    department.length <= MAX_DEPARTMENT_LENGTH,
    `부서는 ${MAX_DEPARTMENT_LENGTH}자 이하로 입력해 주세요.`,
  );
  assert(
    description.length <= MAX_DESCRIPTION_LENGTH,
    `설명은 ${MAX_DESCRIPTION_LENGTH}자 이하로 입력해 주세요.`,
  );
  assert(
    typeof payload.categoryId === "string" && payload.categoryId.trim().length > 0,
    "카테고리를 선택해 주세요.",
  );
  assert(
    typeof payload.imageUrl === "string" && /^https?:\/\//.test(payload.imageUrl),
    "이미지 URL이 올바르지 않아요.",
  );
  assert(
    typeof payload.imageKey === "string" && isMemoryObjectKey(payload.imageKey),
    "이미지 키가 올바르지 않아요.",
  );

  if (payload.imageWidth !== undefined) {
    assert(
      typeof payload.imageWidth === "number" && payload.imageWidth > 0,
      "이미지 너비 정보가 올바르지 않아요.",
    );
  }

  if (payload.imageHeight !== undefined) {
    assert(
      typeof payload.imageHeight === "number" && payload.imageHeight > 0,
      "이미지 높이 정보가 올바르지 않아요.",
    );
  }

  return {
    name,
    nickname,
    department,
    description,
    imageUrl: payload.imageUrl,
    imageKey: payload.imageKey,
    categoryId: payload.categoryId,
    imageWidth: payload.imageWidth,
    imageHeight: payload.imageHeight,
    isVisible: payload.isVisible !== false,
    isCategoryFeatured: payload.isCategoryFeatured === true,
    isMainFeatured: payload.isMainFeatured === true,
  };
}

export function validateUpdateMemoryInput(input: unknown): UpdateMemoryInput {
  assert(input && typeof input === "object", "잘못된 이미지 수정 요청입니다.");

  const payload = input as Partial<UpdateMemoryInput>;
  const name = collapseSpaces(typeof payload.name === "string" ? payload.name : "");
  const nickname = normalizeOptionalText(payload.nickname) || name;
  const department = normalizeOptionalText(payload.department);
  const description = normalizeDescription(
    typeof payload.description === "string" ? payload.description : "",
  );
  const isVisible = normalizeBoolean(payload.isVisible);
  const isCategoryFeatured = normalizeBoolean(payload.isCategoryFeatured);
  const isMainFeatured = normalizeBoolean(payload.isMainFeatured);

  assert(name.length >= 1, "이름을 입력해 주세요.");
  assert(
    name.length <= MAX_NAME_LENGTH,
    `이름은 ${MAX_NAME_LENGTH}자 이하로 입력해 주세요.`,
  );
  assert(nickname.length <= MAX_NICKNAME_LENGTH, "이름이 너무 길어요.");
  assert(
    department.length <= MAX_DEPARTMENT_LENGTH,
    `부서는 ${MAX_DEPARTMENT_LENGTH}자 이하로 입력해 주세요.`,
  );
  assert(
    description.length <= MAX_DESCRIPTION_LENGTH,
    `설명은 ${MAX_DESCRIPTION_LENGTH}자 이하로 입력해 주세요.`,
  );
  assert(isVisible !== null, "노출 여부 값이 올바르지 않아요.");
  assert(
    isCategoryFeatured !== null,
    "대표 이미지 설정 값이 올바르지 않아요.",
  );
  assert(
    isMainFeatured !== null,
    "메인 페이지 노출 설정 값이 올바르지 않아요.",
  );
  assert(
    typeof payload.categoryId === "string" && payload.categoryId.trim().length > 0,
    "카테고리를 선택해 주세요.",
  );

  if (payload.imageUrl !== undefined) {
    assert(
      typeof payload.imageUrl === "string" && /^https?:\/\//.test(payload.imageUrl),
      "이미지 URL이 올바르지 않아요.",
    );
  }

  if (payload.imageKey !== undefined) {
    assert(
      typeof payload.imageKey === "string" && isMemoryObjectKey(payload.imageKey),
      "이미지 키가 올바르지 않아요.",
    );
  }

  if (payload.imageWidth !== undefined) {
    assert(
      typeof payload.imageWidth === "number" && payload.imageWidth > 0,
      "이미지 너비 정보가 올바르지 않아요.",
    );
  }

  if (payload.imageHeight !== undefined) {
    assert(
      typeof payload.imageHeight === "number" && payload.imageHeight > 0,
      "이미지 높이 정보가 올바르지 않아요.",
    );
  }

  return {
    name,
    nickname,
    department,
    description,
    categoryId: payload.categoryId,
    isVisible,
    isCategoryFeatured,
    isMainFeatured,
    imageUrl: payload.imageUrl,
    imageKey: payload.imageKey,
    imageWidth: payload.imageWidth,
    imageHeight: payload.imageHeight,
  };
}
