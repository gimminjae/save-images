"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useEffectEvent } from "react";
import { createPortal } from "react-dom";
import { getPublicMemoryDisplayName } from "@/lib/memory-records";
import type { MemoryRecord } from "@/types/memory";

type MemoryDetailModalProps = {
  memory: MemoryRecord | null;
  onClose: () => void;
};

const formatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function MemoryDetailModal({
  memory,
  onClose,
}: MemoryDetailModalProps) {
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

  if (!memory || typeof document === "undefined") {
    return null;
  }

  const publicName = getPublicMemoryDisplayName(memory);

  return createPortal(
    <div
      className="fixed inset-0 z-[120] bg-[rgba(4,11,24,0.92)] backdrop-blur-md"
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
        className="absolute right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-20 inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-black/35 px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(0,0,0,0.32)] backdrop-blur-xl transition hover:bg-white/18 sm:right-6 sm:top-6"
      >
        닫기
      </button>

      <div className="mx-auto flex h-dvh min-h-0 w-full max-w-7xl flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+4rem)] sm:px-6 sm:pb-6 sm:pt-20">
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:gap-6">
          <div className="flex min-h-0 items-center justify-center overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-2 shadow-[0_18px_42px_rgba(0,0,0,0.28)] sm:p-4">
            <img
              src={memory.imageUrl}
              alt={publicName}
              className="max-h-full w-auto max-w-full rounded-[20px] object-contain"
            />
          </div>

          <div className="min-h-0 rounded-[28px] border border-white/10 bg-black/48 px-4 py-4 shadow-[0_18px_42px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:px-6 sm:py-5 lg:flex lg:flex-col">
            <div className="min-w-0">
              <p className="text-2xl font-black tracking-[-0.05em] text-white sm:text-3xl">
                {publicName}
              </p>
              <p className="mt-1 text-sm font-medium text-white/70 sm:text-base">
                {formatter.format(memory.createdAt)}
              </p>
            </div>

            <div className="mt-4 min-h-0 overflow-y-auto pr-1">
              <p className="whitespace-pre-line text-sm leading-6 text-white/92 sm:text-base sm:leading-7">
                {memory.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
