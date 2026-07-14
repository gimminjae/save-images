"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useEffectEvent, useState } from "react";
import { createPortal } from "react-dom";
import { getPublicMemoryDisplayName } from "@/lib/memory-records";
import type { MemoryRecord } from "@/types/memory";

type MemoryDetailModalProps = {
  memory: MemoryRecord | null;
  onClose: () => void;
  onUpdated?: (memory: MemoryRecord) => void;
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
}: MemoryDetailModalProps) {
  const [activeMemory, setActiveMemory] = useState<MemoryRecord | null>(memory);
  const [managePassword, setManagePassword] = useState("");
  const [showManageAuth, setShowManageAuth] = useState(false);
  const [isUpdatingMainFeature, setIsUpdatingMainFeature] = useState(false);
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
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-30 inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-black/35 px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(0,0,0,0.32)] backdrop-blur-xl transition hover:bg-white/18 sm:right-6 sm:top-6"
      >
        닫기
      </button>

      <div className="mx-auto flex min-h-dvh w-full max-w-[1800px] items-center justify-center px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-[calc(env(safe-area-inset-top)+3.6rem)] sm:px-5 sm:pb-5 sm:pt-18">
        <div className="relative flex h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-4.4rem)] w-full items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_52%,rgba(255,255,255,0))] shadow-[0_20px_60px_rgba(0,0,0,0.34)] sm:h-[calc(100dvh-3rem)] sm:rounded-[32px]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.04)_22%,rgba(0,0,0,0)_38%,rgba(0,0,0,0.18)_100%)]" />
          <div className="flex h-full w-full items-center justify-center px-2 py-2 sm:px-4 sm:py-4">
            <img
              src={memory.imageUrl}
              alt={publicName}
              className="relative z-10 max-h-full w-auto max-w-full rounded-[18px] object-contain shadow-[0_18px_40px_rgba(0,0,0,0.28)] sm:rounded-[24px]"
            />
          </div>

          <div className="pointer-events-none absolute inset-x-2 bottom-2 z-20 sm:inset-x-5 sm:bottom-5">
            <div className="pointer-events-auto mx-auto max-w-4xl rounded-[22px] border border-white/12 bg-[linear-gradient(180deg,rgba(7,14,30,0.76),rgba(7,14,30,0.46))] px-4 py-3 shadow-[0_18px_42px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:rounded-[28px] sm:px-5 sm:py-4">
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
                  <a
                    href={`/api/memories/download/${activeMemory.id}`}
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/12 px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(0,0,0,0.2)] transition hover:bg-white/18"
                  >
                    이미지 다운로드
                  </a>
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
                </div>
              </div>

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

              {activeMemory.description ? (
                <div className="mt-3 max-h-[18vh] overflow-y-auto pr-1 sm:max-h-[22vh]">
                  <p className="whitespace-pre-line text-sm leading-6 text-white/88 sm:text-base sm:leading-7">
                    {activeMemory.description}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
