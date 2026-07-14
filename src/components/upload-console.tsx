"use client";

import { useMemo, useState } from "react";

import type { CategoryNode } from "@/types/domain";

type UploadEntry = {
  clientId: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "uploaded" | "failed";
  error: string | null;
};

type MetadataResult = {
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
};

type PresignedUploadResponse = {
  uploadSessionId: string;
  files: Array<{
    clientId: string;
    mediaId: string;
    uploadUrl: string;
    headers: Record<string, string>;
  }>;
};

function createClientId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

async function readMediaMetadata(file: File): Promise<MetadataResult> {
  if (file.type.startsWith("image/")) {
    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight,
          durationSeconds: null,
        });
        URL.revokeObjectURL(objectUrl);
      };
      image.onerror = () => {
        resolve({ width: null, height: null, durationSeconds: null });
        URL.revokeObjectURL(objectUrl);
      };
      image.src = objectUrl;
    });
  }

  if (file.type.startsWith("video/")) {
    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
        });
        URL.revokeObjectURL(objectUrl);
      };
      video.onerror = () => {
        resolve({ width: null, height: null, durationSeconds: null });
        URL.revokeObjectURL(objectUrl);
      };
      video.src = objectUrl;
    });
  }

  return { width: null, height: null, durationSeconds: null };
}

function uploadWithProgress(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (progress: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });
    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) {
        return;
      }
      onProgress(Math.round((event.loaded / event.total) * 100));
    });
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`업로드 실패 (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("네트워크 오류로 업로드에 실패했습니다."));
    xhr.send(file);
  });
}

export function UploadConsole({ categories }: { categories: CategoryNode[] }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    categories[0]?.id ?? "",
  );
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const hasFiles = entries.length > 0;
  const totalProgress = useMemo(() => {
    if (!entries.length) {
      return 0;
    }

    const sum = entries.reduce((acc, entry) => acc + entry.progress, 0);
    return Math.round(sum / entries.length);
  }, [entries]);

  function updateEntry(clientId: string, updater: (entry: UploadEntry) => UploadEntry) {
    setEntries((current) =>
      current.map((entry) => (entry.clientId === clientId ? updater(entry) : entry)),
    );
  }

  async function handleUpload() {
    if (!selectedCategoryId || !entries.length) {
      setMessage("카테고리와 파일을 먼저 선택해 주세요.");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const presignResponse = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId: selectedCategoryId,
          files: entries.map((entry) => ({
            clientId: entry.clientId,
            name: entry.file.name,
            size: entry.file.size,
            type: entry.file.type,
          })),
        }),
      });

      const presignPayload: PresignedUploadResponse & { error?: string } =
        await presignResponse.json();

      if (!presignResponse.ok) {
        throw new Error(presignPayload.error ?? "업로드 준비에 실패했습니다.");
      }

      const results: Array<{
        mediaId: string;
        clientId: string;
        success: boolean;
        width: number | null;
        height: number | null;
        durationSeconds: number | null;
        error?: string;
      }> = [];

      for (const signed of presignPayload.files) {
        const entry = entries.find((item) => item.clientId === signed.clientId);
        if (!entry) {
          continue;
        }

        try {
          updateEntry(signed.clientId, (current) => ({
            ...current,
            status: "uploading",
            error: null,
          }));

          const metadata = await readMediaMetadata(entry.file);
          await uploadWithProgress(
            signed.uploadUrl,
            entry.file,
            signed.headers,
            (progress) => {
              updateEntry(signed.clientId, (current) => ({
                ...current,
                progress,
              }));
            },
          );

          updateEntry(signed.clientId, (current) => ({
            ...current,
            progress: 100,
            status: "uploaded",
          }));

          results.push({
            mediaId: signed.mediaId,
            clientId: signed.clientId,
            success: true,
            width: metadata.width,
            height: metadata.height,
            durationSeconds: metadata.durationSeconds,
          });
        } catch (uploadError) {
          const messageText =
            uploadError instanceof Error ? uploadError.message : "업로드에 실패했습니다.";
          updateEntry(signed.clientId, (current) => ({
            ...current,
            status: "failed",
            error: messageText,
          }));
          results.push({
            mediaId: signed.mediaId,
            clientId: signed.clientId,
            success: false,
            width: null,
            height: null,
            durationSeconds: null,
            error: messageText,
          });
        }
      }

      const completeResponse = await fetch("/api/uploads/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uploadSessionId: presignPayload.uploadSessionId,
          files: results,
        }),
      });

      const completePayload = await completeResponse.json();
      if (!completeResponse.ok) {
        throw new Error(completePayload.error ?? "업로드 완료 처리에 실패했습니다.");
      }

      setMessage("업로드 완료 처리가 끝났습니다.");
    } catch (uploadError) {
      setMessage(
        uploadError instanceof Error ? uploadError.message : "업로드 중 문제가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <label className="space-y-2">
          <span className="text-sm font-medium">대상 카테고리</span>
          <select
            value={selectedCategoryId}
            onChange={(event) => setSelectedCategoryId(event.target.value)}
            className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {"· ".repeat(category.depth)}
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-white/70 px-5 py-3 font-medium">
          파일 추가
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              setEntries((current) => [
                ...current,
                ...files.map((file) => ({
                  clientId: createClientId(),
                  file,
                  progress: 0,
                  status: "queued" as const,
                  error: null,
                })),
              ]);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="rounded-[28px] border border-[var(--line)] bg-white/70 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold">업로드 진행률</p>
            <p className="text-sm text-black/55">
              직접 업로드 방식이라 큰 영상도 서버를 통과하지 않습니다.
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-black/55">전체</p>
            <p className="font-[var(--font-display)] text-2xl font-bold">
              {totalProgress}%
            </p>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/6">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--gold))] transition-all"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {entries.length ? (
          entries.map((entry) => (
            <div
              key={entry.clientId}
              className="rounded-[24px] border border-[var(--line)] bg-white/75 px-4 py-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{entry.file.name}</p>
                  <p className="text-sm text-black/55">
                    {(entry.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-[#241a12]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-black/65">
                    {entry.status}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setEntries((current) =>
                        current.filter((item) => item.clientId !== entry.clientId),
                      )
                    }
                    className="text-sm text-black/45"
                  >
                    제거
                  </button>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/6">
                <div
                  className="h-full rounded-full bg-[var(--teal)] transition-all"
                  style={{ width: `${entry.progress}%` }}
                />
              </div>
              {entry.error ? (
                <p className="mt-2 text-sm text-red-700">{entry.error}</p>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-white/60 px-5 py-12 text-center text-sm text-black/55">
            업로드할 사진이나 영상을 선택해 주세요.
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleUpload}
          disabled={submitting || !hasFiles}
          className="rounded-full bg-[var(--accent)] px-5 py-3 font-medium text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "업로드 처리 중..." : "업로드 실행"}
        </button>
        {message ? <p className="text-sm text-black/65">{message}</p> : null}
      </div>
    </div>
  );
}
