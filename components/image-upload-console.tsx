"use client";

/* eslint-disable @next/next/no-img-element */

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { readImageDimensions } from "@/lib/browser-images";
import { MEMORY_OBJECT_ROOT } from "@/lib/memories/shared";
import { getFileStemName } from "@/lib/utils";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_FILE_SIZE,
  validateCreateMemoryInput,
} from "@/lib/validations/memory";
import type { CategoryRecord } from "@/types/category";

type ImageUploadConsoleProps = {
  categories: CategoryRecord[];
};

type UploadEntry = {
  id: string;
  file: File;
  name: string;
  categoryId: string;
  imageHeight: number | null;
  imageWidth: number | null;
  previewUrl: string;
  status: "idle" | "uploading" | "success" | "error";
  errorMessage: string | null;
};

const MAX_PARALLEL_UPLOADS = 3;

function getApiErrorMessage(payload: unknown, fallbackMessage: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return fallbackMessage;
}

export function ImageUploadConsole({
  categories,
}: ImageUploadConsoleProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const defaultCategoryId = categories[0]?.id ?? "";
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

  function appendFiles(files: FileList | File[]) {
    const nextEntries = Array.from(files).map<UploadEntry>((file) => ({
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      file,
      name: getFileStemName(file.name),
      categoryId: defaultCategoryId,
      imageHeight: null,
      imageWidth: null,
      previewUrl: URL.createObjectURL(file),
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

  async function uploadEntry(entry: UploadEntry) {
    patchEntry(entry.id, {
      status: "uploading",
      errorMessage: null,
    });

    try {
      const { width, height } = await resolveEntryDimensions(entry);

      validateCreateMemoryInput({
        name: entry.name,
        categoryId: entry.categoryId,
        imageUrl: "https://placeholder.local",
        imageKey: `${MEMORY_OBJECT_ROOT}/placeholder.jpg`,
        imageWidth: width,
        imageHeight: height,
      });

      const payload = new FormData();
      payload.append("name", entry.name);
      payload.append("categoryId", entry.categoryId);
      payload.append("image", entry.file);
      payload.append("imageWidth", String(width));
      payload.append("imageHeight", String(height));

      const response = await fetch("/api/memories", {
        method: "POST",
        body: payload,
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(getApiErrorMessage(result, "업로드에 실패했어요."));
      }

      patchEntry(entry.id, {
        status: "success",
        errorMessage: null,
        imageWidth: width,
        imageHeight: height,
      });

      return true;
    } catch (uploadError) {
      patchEntry(entry.id, {
        status: "error",
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

    const uploadTargets = entries.filter((entry) => entry.status !== "success");

    if (uploadTargets.some((entry) => entry.categoryId.trim().length === 0)) {
      setError("모든 이미지에 카테고리를 선택해 주세요.");
      return;
    }

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

          const didSucceed = await uploadEntry(nextEntry);

          if (didSucceed) {
            successCount += 1;
          } else {
            failureCount += 1;
          }
        }
      }),
    );

    setIsUploading(false);

    if (failureCount === 0 && successCount === entries.length) {
      setMessage("모든 이미지 업로드가 완료됐어요.");
      startTransition(() => {
        router.push("/");
        router.refresh();
      });
      return;
    }

    setError("일부 이미지 업로드에 실패했어요. 실패한 항목만 다시 시도할 수 있어요.");
  }

  return (
    <section className="event-panel rounded-[32px] px-4 py-5 sm:rounded-[36px] sm:px-6 sm:py-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
          이미지 업로드
        </h1>
        <span className="rounded-full bg-white/85 px-4 py-2 text-sm font-black text-sky-950">
          완료 {completedCount}/{entries.length}
        </span>
      </div>

      <div className="mt-5 rounded-[26px] border border-sky-200/70 bg-white/75 p-4">
        <input
          type="file"
          multiple
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
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
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
        <span>최대 {Math.floor(MAX_IMAGE_FILE_SIZE / (1024 * 1024))}MB</span>
        <span>동시에 최대 {MAX_PARALLEL_UPLOADS}장 업로드</span>
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
              <div className="flex h-[220px] items-center justify-center overflow-hidden rounded-[22px] border border-white/70 bg-sky-50 p-3">
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

                <label className="grid gap-2">
                  <span className="text-sm font-black text-slate-900">
                    카테고리
                  </span>
                  <select
                    value={entry.categoryId}
                    onChange={(event) =>
                      setEntries((current) =>
                        current.map((item) =>
                          item.id === entry.id
                            ? { ...item, categoryId: event.target.value }
                            : item,
                        ),
                      )
                    }
                    disabled={isUploading}
                    className="event-input h-[48px] rounded-[16px] px-4 text-sm text-slate-900 outline-none"
                  >
                    <option value="">카테고리 선택</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {"· ".repeat(category.depth)}
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">
                  {entry.file.name}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    entry.status === "success"
                      ? "bg-emerald-100 text-emerald-700"
                      : entry.status === "error"
                        ? "bg-rose-100 text-rose-700"
                        : entry.status === "uploading"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {entry.status === "success"
                    ? "완료"
                    : entry.status === "error"
                      ? "실패"
                      : entry.status === "uploading"
                        ? "업로드 중"
                        : "대기"}
                </span>
              </div>

              {entry.errorMessage ? (
                <div className="mt-3 rounded-[18px] border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700">
                  {entry.errorMessage}
                </div>
              ) : null}

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() =>
                    setEntries((current) => {
                      const target = current.find((item) => item.id === entry.id);

                      if (target) {
                        URL.revokeObjectURL(target.previewUrl);
                      }

                      return current.filter((item) => item.id !== entry.id);
                    })
                  }
                  className="inline-flex h-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-sm font-black text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  목록에서 제거
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() => void handleUploadAll()}
          disabled={isUploading || entries.length === 0 || categories.length === 0}
          className="event-button-primary inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading ? "업로드 진행 중..." : "선택한 이미지 업로드"}
        </button>
      </div>
    </section>
  );
}
