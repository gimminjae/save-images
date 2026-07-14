import { readJson } from "@/lib/api-client";

type PresignedUploadResponse = {
  expiresAt: number;
  fileKey: string;
  headers: Record<string, string>;
  publicUrl: string;
  uploadToken: string;
  uploadUrl: string;
};

export async function requestPresignedUpload(
  endpoint: string,
  file: File,
) {
  const response = await readJson<PresignedUploadResponse>(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    }),
  });

  try {
    return {
      ...response,
      uploadUrl: new URL(response.uploadUrl).toString(),
    };
  } catch {
    throw createDirectUploadError(
      "invalid_url",
      "업로드 주소 형식이 올바르지 않아요. 파일 이름을 조금 더 단순하게 바꾸고 다시 시도해 주세요.",
    );
  }
}

function createDirectUploadError(code: string, message: string) {
  const error = new Error(message) as Error & { code: string };

  error.name = "DirectUploadError";
  error.code = code;

  return error;
}

export function isRecoverableDirectUploadError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    ["invalid_url", "request_setup", "network"].includes(error.code)
  );
}

export function uploadFileToPresignedUrl(params: {
  file: File;
  headers: Record<string, string>;
  onProgress?: (progress: number) => void;
  uploadUrl: string;
}) {
  return new Promise<void>((resolve, reject) => {
    let xhr: XMLHttpRequest;

    try {
      xhr = new XMLHttpRequest();
      xhr.open("PUT", params.uploadUrl);

      Object.entries(params.headers).forEach(([key, value]) => {
        if (!key || !value) {
          return;
        }

        xhr.setRequestHeader(key, value);
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "업로드 요청 생성에 실패했어요.";

      reject(
        createDirectUploadError(
          "request_setup",
          message.includes("expected pattern")
            ? "업로드 주소 형식이 올바르지 않아요. 파일 이름에 특수문자가 많으면 이름을 조금 바꾸고 다시 시도해 주세요."
            : "직접 업로드 요청을 준비하지 못했어요. 자동으로 다른 업로드 방식으로 다시 시도할 수 있어요.",
        ),
      );
      return;
    }

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) {
        return;
      }

      params.onProgress?.(
        Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100))),
      );
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        params.onProgress?.(100);
        resolve();
        return;
      }

      reject(
        new Error(
          xhr.status === 403
            ? "S3 직접 업로드 권한이 없어요. 버킷 CORS와 presigned URL 만료 시간을 확인해 주세요."
            : "S3 직접 업로드에 실패했어요.",
        ),
      );
    };

    xhr.onerror = () => {
      reject(
        createDirectUploadError(
          "network",
          "S3 직접 업로드에 실패했어요. 버킷 CORS에서 PUT 요청을 허용했는지도 확인해 주세요.",
        ),
      );
    };

    try {
      xhr.send(params.file);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "업로드 요청 전송에 실패했어요.";

      reject(
        createDirectUploadError(
          "request_setup",
          message.includes("expected pattern")
            ? "업로드 요청 문자열 형식이 올바르지 않아요. 파일 이름을 조금 단순하게 바꾸고 다시 시도해 주세요."
            : "직접 업로드 요청을 전송하지 못했어요. 자동으로 다른 업로드 방식으로 다시 시도할 수 있어요.",
        ),
      );
    }
  });
}
