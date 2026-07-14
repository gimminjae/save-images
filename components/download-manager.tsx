"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { getPublicMemoryDisplayName } from "@/lib/memory-records";
import type { MemoryRecord } from "@/types/memory";

type DownloadManagerProps = {
  memories: MemoryRecord[];
};

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function DownloadManager({ memories }: DownloadManagerProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const allSelected =
    memories.length > 0 && selectedIds.length === memories.length;

  async function handleDownloadSelected() {
    if (selectedIds.length === 0) {
      setErrorMessage("먼저 다운로드할 이미지를 선택해 주세요.");
      return;
    }

    setIsDownloadingZip(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/memories/download-zip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: selectedIds,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "선택 다운로드에 실패했어요.");
      }

      const blob = await response.blob();
      triggerBlobDownload(
        blob,
        `memories-${new Date().toISOString().slice(0, 10)}.zip`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "선택 다운로드에 실패했어요.",
      );
    } finally {
      setIsDownloadingZip(false);
    }
  }

  return (
    <section className="event-panel rounded-[32px] px-4 py-5 sm:rounded-[36px] sm:px-6 sm:py-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black tracking-[0.08em] text-sky-700">
            이미지 다운로드
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
            다운로드 센터
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-700 sm:text-base">
            등록된 이미지를 개별로 받거나, 여러 장을 선택해서 ZIP으로 한 번에
            내려받을 수 있어요.
          </p>
        </div>

        <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => {
              setSelectedIds(allSelected ? [] : memories.map((memory) => memory.id));
              setErrorMessage(null);
            }}
            className="event-button-secondary inline-flex h-11 w-full items-center justify-center rounded-full px-5 text-sm font-black text-sky-950 transition hover:-translate-y-0.5 sm:w-auto"
          >
            {allSelected ? "전체 해제" : "전체 선택"}
          </button>
          <button
            type="button"
            onClick={handleDownloadSelected}
            disabled={isDownloadingZip}
            className="event-button-primary inline-flex h-11 w-full items-center justify-center rounded-full px-5 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isDownloadingZip
              ? "ZIP 만드는 중..."
              : `선택 다운로드 (${selectedIds.length})`}
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-[22px] border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {memories.map((memory) => {
          const isSelected = selectedIds.includes(memory.id);
          const publicName = getPublicMemoryDisplayName(memory);

          return (
            <article
              key={memory.id}
              className="rounded-[26px] border border-sky-300/65 bg-white/88 p-4 shadow-[0_16px_28px_rgba(33,110,178,0.12)] sm:rounded-[30px]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex items-center gap-2 text-sm font-black text-slate-900">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(event) => {
                      setSelectedIds((current) => {
                        if (event.target.checked) {
                          return [...current, memory.id];
                        }

                        return current.filter((id) => id !== memory.id);
                      });
                    }}
                    className="h-4 w-4 rounded border-sky-300 text-sky-500"
                  />
                  선택
                </label>
                <a
                  href={`/api/memories/download/${memory.id}`}
                  className="event-button-secondary inline-flex h-10 w-full items-center justify-center rounded-full px-4 text-xs font-black text-sky-950 transition hover:-translate-y-0.5 sm:h-9 sm:w-auto"
                >
                  단건 다운로드
                </a>
              </div>

              <div className="mt-4 flex h-[220px] items-center justify-center overflow-hidden rounded-[20px] border border-white/70 bg-sky-50 p-3 sm:h-[250px] sm:rounded-[22px] xl:h-[280px]">
                <img
                  src={memory.imageUrl}
                  alt={publicName}
                  className="max-h-full w-auto max-w-full object-contain"
                />
              </div>

              <div className="mt-4">
                <p className="text-xl font-black tracking-[-0.05em] text-slate-950">
                  {publicName}
                </p>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-700">
                  {memory.description}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
