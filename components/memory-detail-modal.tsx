"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useEffectEvent } from "react";
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

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      onKeyDown(event);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [memory]);

  if (!memory) {
    return null;
  }

  const publicName = getPublicMemoryDisplayName(memory);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/92"
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
        className="absolute right-4 top-4 z-20 inline-flex h-11 items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 text-sm font-black text-white backdrop-blur-md transition hover:bg-white/18 sm:right-6 sm:top-6"
      >
        닫기
      </button>

      <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-16 sm:px-8 sm:pb-6 sm:pt-20">
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <img
            src={memory.imageUrl}
            alt={publicName}
            className="max-h-full w-auto max-w-full object-contain"
          />
        </div>

        <div className="mt-4 shrink-0 rounded-[28px] border border-white/10 bg-black/58 px-5 py-4 backdrop-blur-lg sm:mt-6 sm:px-8 sm:py-5">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <p className="text-2xl font-black tracking-[-0.05em] text-white sm:text-3xl">
                {publicName}
              </p>
              <p className="mt-1 text-sm font-medium text-white/70 sm:text-base">
                {formatter.format(memory.createdAt)}
              </p>
            </div>
            <p className="max-h-[20vh] max-w-3xl overflow-y-auto pr-1 whitespace-pre-line text-sm leading-6 text-white/90 sm:max-h-[24vh] sm:text-base sm:leading-7">
              {memory.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
