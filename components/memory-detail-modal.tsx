"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useEffectEvent, useState } from "react";
import { createPortal } from "react-dom";
import { invalidateApiClientCache } from "@/lib/api-client";
import { getPublicMemoryDisplayName } from "@/lib/memory-records";
import type { MemoryRecord } from "@/types/memory";

type MemoryDetailModalProps = {
  memory: MemoryRecord | null;
  onClose: () => void;
  onUpdated?: (memory: MemoryRecord) => void;
  allowMainFeatureToggle?: boolean;
};

const formatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function MemoryDetailModal({
  memory,
  onClose,
  onUpdated,
  allowMainFeatureToggle = true,
}: MemoryDetailModalProps) {
  const [activeMemory, setActiveMemory] = useState<MemoryRecord | null>(memory);
  const [managePassword, setManagePassword] = useState("");
  const [showManageAuth, setShowManageAuth] = useState(false);
  const [isUpdatingMainFeature, setIsUpdatingMainFeature] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);
  const [manageMessage, setManageMessage] = useState<string | null>(null);

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      onClose();
    }
  });

  useEffect(() => {
    if (!memory) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      onKeyDown(event);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [memory]);

  function encodeBasicAuthorization(password: string) {
    const encoded = new TextEncoder().encode(`admin:${password}`);
    let binary = "";

    encoded.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });

    return `Basic ${btoa(binary)}`;
  }

  function sanitizeFileNamePart(value: string) {
    return (
      value
        .normalize("NFC")
        .replace(/[\\/:*?"<>|]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60) || "image"
    );
  }

  function getClientDownloadFileName(targetMemory: MemoryRecord) {
    const date = new Date(targetMemory.createdAt).toISOString().slice(0, 10);
    const extensionMatch = (
      targetMemory.imageKey ||
      targetMemory.downloadUrl ||
      targetMemory.imageUrl
    ).match(/\.[a-zA-Z0-9]+$/);
    const extension = extensionMatch?.[0] ?? ".jpg";

    return `${sanitizeFileNamePart(getPublicMemoryDisplayName(targetMemory))}-${date}${extension}`;
  }

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

  async function handleDownload() {
    if (!activeMemory || isDownloading) {
      return;
    }

    setIsDownloading(true);
    setDownloadError(null);

    const isLocalPublicImage =
      activeMemory.id.startsWith("public-main:") ||
      activeMemory.imageUrl.startsWith("/images/") ||
      activeMemory.downloadUrl?.startsWith("/images/") === true;
    const downloadUrl = isLocalPublicImage
      ? (activeMemory.downloadUrl ?? activeMemory.imageUrl)
      : `/api/memories/download/${activeMemory.id}`;

    try {
      const response = await fetch(downloadUrl, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("이미지 다운로드를 시작하지 못했어요.");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition");
      const encodedFileName = contentDisposition?.match(
        /filename\*=UTF-8''([^;]+)/i,
      )?.[1];
      const fallbackFileName = contentDisposition?.match(
        /filename="([^"]+)"/i,
      )?.[1];
      const fileName = encodedFileName
        ? decodeURIComponent(encodedFileName)
        : fallbackFileName || getClientDownloadFileName(activeMemory);

      triggerBlobDownload(blob, fileName);
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : "이미지 다운로드를 시작하지 못했어요.",
      );
    } finally {
      setIsDownloading(false);
    }
  }

  async function updateMainFeature(nextIsMainFeatured: boolean) {
    if (!activeMemory) {
      return;
    }

    setIsUpdatingMainFeature(true);
    setManageError(null);
    setManageMessage(null);

    const password = managePassword.trim();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (password) {
      headers.Authorization = encodeBasicAuthorization(password);
    }

    try {
      const response = await fetch(`/api/admin/memories/${activeMemory.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          isMainFeatured: nextIsMainFeatured,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; memory?: MemoryRecord }
        | null;

      if (response.status === 401) {
        setShowManageAuth(true);
        throw new Error(
          password
            ? "관리자 비밀번호가 올바르지 않아요."
            : "관리자 비밀번호를 입력해 주세요.",
        );
      }

      if (!response.ok || !payload?.memory) {
        throw new Error(payload?.error || "홈 화면 게시 상태를 바꾸지 못했어요.");
      }

      invalidateApiClientCache();
      setActiveMemory(payload.memory);
      onUpdated?.(payload.memory);
      setShowManageAuth(false);
      setManageMessage(
        nextIsMainFeatured
          ? "홈 화면 전시에 게시했어요."
          : "홈 화면 전시에서 내렸어요.",
      );
    } catch (error) {
      setManageError(
        error instanceof Error
          ? error.message
          : "홈 화면 게시 상태를 바꾸지 못했어요.",
      );
    } finally {
      setIsUpdatingMainFeature(false);
    }
  }

  if (!memory || !activeMemory || typeof document === "undefined") {
    return null;
  }

  const publicName = getPublicMemoryDisplayName(activeMemory);

  return createPortal(
    <div
      className="fixed inset-0 z-[120] overflow-y-auto overscroll-contain bg-[rgba(4,11,24,0.92)] backdrop-blur-md"
      aria-label={`${publicName} 상세 이미지`}
      aria-modal="true"
      role="dialog"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-[1800px] items-center justify-center px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-[calc(env(safe-area-inset-top)+0.5rem)] sm:px-5 sm:pb-5 sm:pt-5">
        <div className="flex w-full max-w-[1680px] flex-col gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onClose}
            className="relative flex h-[min(74dvh,980px)] w-full items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_52%,rgba(255,255,255,0))] shadow-[0_20px_60px_rgba(0,0,0,0.34)] sm:rounded-[32px]"
            aria-label="이미지 닫기"
          >
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.03)_22%,rgba(0,0,0,0)_38%,rgba(0,0,0,0.12)_100%)]" />
            <div className="flex h-full w-full items-center justify-center px-2 py-2 sm:px-4 sm:py-4">
              <img
                src={activeMemory.imageUrl}
                alt={publicName}
                className="relative z-10 max-h-full w-auto max-w-full object-contain shadow-[0_18px_40px_rgba(0,0,0,0.28)]"
              />
            </div>
          </button>

          <div className="mx-auto w-full max-w-5xl rounded-[22px] border border-white/12 bg-[linear-gradient(180deg,rgba(7,14,30,0.76),rgba(7,14,30,0.46))] px-4 py-3 shadow-[0_18px_42px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:rounded-[28px] sm:px-5 sm:py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-black tracking-[-0.05em] text-white sm:text-2xl">
                  {publicName}
                </p>
                <p className="mt-1 text-xs font-medium text-white/68 sm:text-sm">
                  {formatter.format(activeMemory.createdAt)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleDownload();
                  }}
                  disabled={isDownloading}
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-white/90 bg-white/92 px-4 text-sm font-black whitespace-nowrap text-slate-950 shadow-[0_12px_28px_rgba(0,0,0,0.2)] transition hover:bg-white"
                >
                  {isDownloading ? "다운로드 준비 중..." : "이미지 다운로드"}
                </button>
                {allowMainFeatureToggle ? (
                  <button
                    type="button"
                    onClick={() =>
                      void updateMainFeature(!activeMemory.isMainFeatured)
                    }
                    disabled={isUpdatingMainFeature}
                    className={`inline-flex h-10 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(0,0,0,0.2)] transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      activeMemory.isMainFeatured
                        ? "border-rose-300/40 bg-rose-500/28 hover:bg-rose-500/36"
                        : "border-emerald-300/35 bg-emerald-500/24 hover:bg-emerald-500/32"
                    }`}
                  >
                    {isUpdatingMainFeature
                      ? "변경 중..."
                      : activeMemory.isMainFeatured
                        ? "홈화면 게시 해제"
                        : "홈화면 게시"}
                  </button>
                ) : null}
              </div>
            </div>

            {allowMainFeatureToggle ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-[0.72rem] font-black tracking-[0.08em] ${
                      activeMemory.isMainFeatured
                        ? "bg-fuchsia-200/25 text-fuchsia-50"
                        : "bg-white/10 text-white/70"
                    }`}
                  >
                    {activeMemory.isMainFeatured
                      ? "홈화면 게시 중"
                      : "홈화면 미게시"}
                  </span>
                  {manageMessage ? (
                    <span className="rounded-full bg-emerald-300/18 px-3 py-1 text-[0.72rem] font-black text-emerald-50">
                      {manageMessage}
                    </span>
                  ) : null}
                </div>

                {showManageAuth ? (
                  <form
                    className="mt-3 flex flex-col gap-2 sm:flex-row"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void updateMainFeature(!activeMemory.isMainFeatured);
                    }}
                  >
                    <input
                      type="password"
                      value={managePassword}
                      onChange={(event) => setManagePassword(event.target.value)}
                      placeholder="관리자 비밀번호"
                      className="h-11 min-w-0 flex-1 rounded-full border border-white/14 bg-black/28 px-4 text-sm text-white outline-none placeholder:text-white/45"
                    />
                    <button
                      type="submit"
                      disabled={isUpdatingMainFeature || !managePassword.trim()}
                      className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/12 px-4 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      인증 후 변경
                    </button>
                  </form>
                ) : null}

                {manageError ? (
                  <div className="mt-3 rounded-[18px] border border-rose-300/24 bg-rose-500/14 px-4 py-3 text-sm text-rose-50">
                    {manageError}
                  </div>
                ) : null}
              </>
            ) : null}

            {activeMemory.description ? (
              <div className="mt-3 max-h-[18vh] overflow-y-auto pr-1 sm:max-h-[22vh]">
                <p className="whitespace-pre-line text-sm leading-6 text-white/88 sm:text-base sm:leading-7">
                  {activeMemory.description}
                </p>
              </div>
            ) : null}
                </div>

                {downloadError ? (
                  <div className="rounded-[18px] border border-rose-300/24 bg-rose-500/14 px-4 py-3 text-sm text-rose-50">
                    {downloadError}
                  </div>
                ) : null}
              </div>
            </div>
    </div>,
    document.body,
  );
}
