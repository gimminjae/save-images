"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { invalidateApiClientCache, readJson } from "@/lib/api-client";
import { readImageDimensions } from "@/lib/browser-images";
import {
  isRecoverableDirectUploadError,
  requestPresignedUpload,
  uploadFileToPresignedUrl,
} from "@/lib/direct-upload-client";
import { MEMORY_OBJECT_ROOT } from "@/lib/memories/shared";
import { getFileStemName } from "@/lib/utils";
import {
  ACCEPTED_IMAGE_INPUT_ACCEPT,
  MAX_IMAGE_FILE_SIZE,
  validateCreateMemoryInput,
} from "@/lib/validations/memory";
import type { CategoryRecord } from "@/types/category";

type ImageUploadConsoleProps = {
  categories: CategoryRecord[];
};

type UploadEntry = {
  errorMessage: string | null;
  file: File;
  id: string;
  imageHeight: number | null;
  imageWidth: number | null;
  name: string;
  previewUrl: string;
  progress: number;
  status: "idle" | "preparing" | "uploading" | "saving" | "success" | "error";
};

type CreateMemoryResponse = {
  error?: string;
};

const MAX_PARALLEL_UPLOADS = 4;

function getEntryStatusLabel(status: UploadEntry["status"]) {
  switch (status) {
    case "preparing":
      return "준비 중";
    case "uploading":
      return "S3 업로드 중";
    case "saving":
      return "저장 중";
    case "success":
      return "완료";
    case "error":
      return "실패";
    default:
      return "대기";
  }
}

function getEntryStatusClass(status: UploadEntry["status"]) {
  switch (status) {
    case "preparing":
    case "uploading":
    case "saving":
      return "bg-sky-100 text-sky-700";
    case "success":
      return "bg-emerald-100 text-emerald-700";
    case "error":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-200 text-slate-600";
  }
}

export function ImageUploadConsole({
  categories,
}: ImageUploadConsoleProps) {
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    categories[0]?.id ?? "",
  );
  const entriesRef = useRef<UploadEntry[]>([]);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  useEffect(() => {
    return () => {
      entriesRef.current.forEach((entry) => {
        URL.revokeObjectURL(entry.previewUrl);
      });
    };
  }, []);

  const completedCount = useMemo(
    () => entries.filter((entry) => entry.status === "success").length,
    [entries],
  );
  const activeCount = useMemo(
    () =>
      entries.filter((entry) =>
        ["preparing", "uploading", "saving"].includes(entry.status),
      ).length,
    [entries],
  );
  const effectiveCategoryId = selectedCategoryId || categories[0]?.id || "";
  const selectedCategory = useMemo(
    () =>
      categories.find((category) => category.id === effectiveCategoryId) ?? null,
    [categories, effectiveCategoryId],
  );

  function appendFiles(files: FileList | File[]) {
    const nextEntries = Array.from(files).map<UploadEntry>((file) => ({
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      file,
      name: getFileStemName(file.name),
      imageHeight: null,
      imageWidth: null,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
      status: "idle",
      errorMessage: null,
    }));

    setEntries((current) => [...current, ...nextEntries]);
    setError(null);
    setMessage(null);
  }

  function patchEntry(entryId: string, updates: Partial<UploadEntry>) {
    setEntries((current) =>
      current.map((item) =>
        item.id === entryId ? { ...item, ...updates } : item,
      ),
    );
  }

  async function resolveEntryDimensions(entry: UploadEntry) {
    if (
      typeof entry.imageWidth === "number" &&
      typeof entry.imageHeight === "number"
    ) {
      return {
        width: entry.imageWidth,
        height: entry.imageHeight,
      };
    }

    const { width, height } = await readImageDimensions(entry.file);

    patchEntry(entry.id, {
      imageWidth: width,
      imageHeight: height,
    });

    return { width, height };
  }

  async function uploadEntry(entry: UploadEntry, categoryId: string) {
    patchEntry(entry.id, {
      status: "preparing",
      progress: 4,
      errorMessage: null,
    });

    try {
      const { width, height } = await resolveEntryDimensions(entry);

      validateCreateMemoryInput({
        name: entry.name,
        categoryId,
        imageUrl: "https://placeholder.local",
        imageKey: `${MEMORY_OBJECT_ROOT}/placeholder.jpg`,
        imageWidth: width,
        imageHeight: height,
      });

      try {
        const presignedUpload = await requestPresignedUpload(
          "/api/memories/presign",
          entry.file,
        );

        patchEntry(entry.id, {
          status: "uploading",
          progress: 8,
        });

        await uploadFileToPresignedUrl({
          file: entry.file,
          headers: presignedUpload.headers,
          uploadUrl: presignedUpload.uploadUrl,
          onProgress: (progress) => {
            patchEntry(entry.id, {
              status: "uploading",
              progress,
            });
          },
        });

        patchEntry(entry.id, {
          status: "saving",
          progress: 100,
        });

        await readJson<CreateMemoryResponse>("/api/memories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            categoryId,
            imageHeight: height,
            imageKey: presignedUpload.fileKey,
            imageUrl: presignedUpload.publicUrl,
            imageWidth: width,
            name: entry.name,
            uploadToken: presignedUpload.uploadToken,
          }),
        });
      } catch (directUploadError) {
        if (!isRecoverableDirectUploadError(directUploadError)) {
          throw directUploadError;
        }

        patchEntry(entry.id, {
          status: "saving",
          progress: 35,
          errorMessage: null,
        });

        const payload = new FormData();
        payload.append("name", entry.name);
        payload.append("categoryId", categoryId);
        payload.append("image", entry.file);
        payload.append("imageWidth", String(width));
        payload.append("imageHeight", String(height));

        const response = await fetch("/api/memories", {
          method: "POST",
          body: payload,
        });
        const result = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(result.error || "업로드에 실패했어요.");
        }
      }

      patchEntry(entry.id, {
        status: "success",
        progress: 100,
        errorMessage: null,
        imageWidth: width,
        imageHeight: height,
      });

      return true;
    } catch (uploadError) {
      patchEntry(entry.id, {
        status: "error",
        progress: 0,
        errorMessage:
          uploadError instanceof Error
            ? uploadError.message
            : "업로드에 실패했어요.",
      });

      return false;
    }
  }

  async function handleUploadAll() {
    if (entries.length === 0) {
      setError("업로드할 이미지를 먼저 선택해 주세요.");
      return;
    }

    if (!effectiveCategoryId.trim()) {
      setError("상단에서 업로드할 카테고리를 먼저 선택해 주세요.");
      return;
    }

    const uploadTargets = entries.filter((entry) => entry.status !== "success");
    const uploadCategoryId = effectiveCategoryId;

    setIsUploading(true);
    setError(null);
    setMessage(null);

    let successCount = entries.filter((entry) => entry.status === "success").length;
    let failureCount = 0;
    const pendingEntries = [...uploadTargets];
    const workerCount = Math.min(MAX_PARALLEL_UPLOADS, pendingEntries.length);

    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (pendingEntries.length > 0) {
          const nextEntry = pendingEntries.shift();

          if (!nextEntry) {
            break;
          }

          const didSucceed = await uploadEntry(nextEntry, uploadCategoryId);

          if (didSucceed) {
            successCount += 1;
          } else {
            failureCount += 1;
          }
        }
      }),
    );

    setIsUploading(false);

    if (successCount > 0) {
      invalidateApiClientCache();
    }

    if (failureCount === 0 && successCount === entries.length) {
      setMessage(
        "모든 이미지 업로드가 완료됐어요. 상단에서 선택한 카테고리로 한 번에 저장했어요.",
      );
      return;
    }

    setError("일부 이미지 업로드에 실패했어요. 실패한 항목만 다시 시도할 수 있어요.");
  }

  function removeEntry(entryId: string) {
    setEntries((current) => {
      const target = current.find((item) => item.id === entryId);

      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return current.filter((item) => item.id !== entryId);
    });
  }

  function clearCompletedEntries() {
    setEntries((current) => {
      current
        .filter((entry) => entry.status === "success")
        .forEach((entry) => {
          URL.revokeObjectURL(entry.previewUrl);
        });

      return current.filter((entry) => entry.status !== "success");
    });
  }

  return (
    <section className="event-panel rounded-[32px] px-4 py-5 sm:rounded-[36px] sm:px-6 sm:py-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
          이미지 업로드
        </h1>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white/85 px-4 py-2 text-sm font-black text-sky-950">
            진행 {activeCount}장
          </span>
          <span className="rounded-full bg-white/85 px-4 py-2 text-sm font-black text-sky-950">
            완료 {completedCount}/{entries.length}
          </span>
        </div>
      </div>

      <div className="mt-5 rounded-[26px] border border-sky-200/70 bg-white/75 p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
          <input
            type="file"
            multiple
            accept={ACCEPTED_IMAGE_INPUT_ACCEPT}
            disabled={isUploading || categories.length === 0}
            onChange={(event) => {
              const files = event.target.files;

              if (!files || files.length === 0) {
                return;
              }

              appendFiles(files);
              event.target.value = "";
            }}
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-sky-500 file:px-4 file:py-2.5 file:text-sm file:font-black file:text-white"
          />
          <select
            value={effectiveCategoryId}
            onChange={(event) => setSelectedCategoryId(event.target.value)}
            disabled={isUploading || categories.length === 0}
            className="event-input h-[48px] rounded-[16px] px-4 text-sm font-black text-slate-900 outline-none"
          >
            <option value="">업로드 카테고리 선택</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {"· ".repeat(category.depth)}
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
          <span>최대 {Math.floor(MAX_IMAGE_FILE_SIZE / (1024 * 1024))}MB</span>
          <span>동시에 최대 {MAX_PARALLEL_UPLOADS}장 업로드</span>
          <span>브라우저에서 S3로 직접 전송</span>
          <span>
            현재 카테고리: {selectedCategory ? selectedCategory.name : "미선택"}
          </span>
          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sky-700">
            JPG / PNG / WEBP
          </span>
        </div>
      </div>

      {message ? (
        <div className="mt-4 rounded-[20px] border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-[20px] border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {categories.length === 0 ? (
        <div className="mt-5 rounded-[24px] border border-dashed border-sky-300/70 bg-white/75 px-6 py-10 text-center text-sm font-bold text-slate-600">
          업로드 전에 카테고리를 먼저 만들어 주세요.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {entries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-[28px] border border-sky-300/65 bg-white/88 p-4 shadow-[0_16px_28px_rgba(33,110,178,0.12)]"
            >
              <div className="flex h-[200px] items-center justify-center overflow-hidden rounded-[22px] border border-white/70 bg-sky-50 p-3 sm:h-[220px]">
                <img
                  src={entry.previewUrl}
                  alt={entry.name}
                  className="max-h-full w-auto max-w-full object-contain"
                />
              </div>

              <div className="mt-4 grid gap-3">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-900">이름</span>
                  <input
                    value={entry.name}
                    onChange={(event) =>
                      setEntries((current) =>
                        current.map((item) =>
                          item.id === entry.id
                            ? { ...item, name: event.target.value }
                            : item,
                        ),
                      )
                    }
                    disabled={isUploading}
                    className="event-input h-[48px] rounded-[16px] px-4 text-sm text-slate-900 outline-none"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">
                  {entry.file.name}
                </span>
                {selectedCategory ? (
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                    {selectedCategory.name}
                  </span>
                ) : null}
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${getEntryStatusClass(entry.status)}`}
                >
                  {getEntryStatusLabel(entry.status)}
                </span>
                {(entry.status === "uploading" ||
                  entry.status === "saving" ||
                  entry.status === "success") && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {entry.progress}%
                  </span>
                )}
              </div>

              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${
                      entry.status === "error"
                        ? "bg-rose-400"
                        : entry.status === "success"
                          ? "bg-emerald-400"
                          : "bg-sky-400"
                    }`}
                    style={{ width: `${entry.progress}%` }}
                  />
                </div>
              </div>

              {entry.errorMessage ? (
                <div className="mt-3 rounded-[18px] border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700">
                  {entry.errorMessage}
                </div>
              ) : null}

              <div className="mt-4 flex">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => removeEntry(entry.id)}
                  className="inline-flex h-10 w-full items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-sm font-black text-rose-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  목록에서 제거
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={clearCompletedEntries}
          disabled={isUploading || completedCount === 0}
          className="event-button-secondary inline-flex h-12 w-full items-center justify-center rounded-full px-6 text-sm font-black text-sky-950 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          완료 항목 정리
        </button>
        <button
          type="button"
          onClick={() => void handleUploadAll()}
          disabled={
            isUploading ||
            entries.length === 0 ||
            categories.length === 0 ||
            !effectiveCategoryId
          }
          className="event-button-primary inline-flex h-12 w-full items-center justify-center rounded-full px-6 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isUploading ? "직접 업로드 진행 중..." : "선택한 이미지 빠르게 업로드"}
        </button>
      </div>
    </section>
  );
}
