import "server-only";

import {
  createMemoryObjectKey,
  createPresignedMemoryUpload,
} from "@/lib/aws/s3";
import {
  getImageExtension,
  validateImageUploadInput,
} from "@/lib/validations/memory";

export async function createMemoryUploadReservation(input: unknown) {
  const validatedFile = validateImageUploadInput(input);
  const extension = getImageExtension(validatedFile.fileType);

  if (!extension) {
    throw new Error("지원하지 않는 이미지 형식입니다.");
  }

  const fileKey = createMemoryObjectKey(extension, validatedFile.fileName);

  return createPresignedMemoryUpload({
    contentType: validatedFile.fileType,
    fileKey,
    fileSize: validatedFile.fileSize,
  });
}
