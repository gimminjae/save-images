"use client";

import type { MemoryRecord } from "@/types/memory";

type PublishedMemoriesResponse = {
  memories?: MemoryRecord[];
  error?: string;
};

async function fetchPublishedMemories(signal?: AbortSignal) {
  const response = await fetch("/api/memories", {
    cache: "no-store",
    signal,
  });
  const payload = (await response.json().catch(() => null)) as
    | PublishedMemoriesResponse
    | null;

  if (!response.ok) {
    throw new Error(payload?.error || "전시 이미지를 새로고침하지 못했어요.");
  }

  return Array.isArray(payload?.memories) ? payload.memories : [];
}

export function subscribeToPublishedMemories(
  onChange: (memories: MemoryRecord[]) => void,
  onError: (error: Error) => void,
  intervalMs = 10000,
) {
  let active = true;
  let timer: number | null = null;
  let activeController: AbortController | null = null;

  const poll = async () => {
    activeController = new AbortController();

    try {
      const memories = await fetchPublishedMemories(activeController.signal);

      if (active) {
        onChange(memories);
      }
    } catch (error) {
      if (active) {
        onError(
          error instanceof Error
            ? error
            : new Error("전시 이미지를 새로고침하지 못했어요."),
        );
      }
    } finally {
      if (active) {
        timer = window.setTimeout(poll, intervalMs);
      }
    }
  };

  timer = window.setTimeout(poll, intervalMs);

  return () => {
    active = false;
    activeController?.abort();

    if (timer !== null) {
      window.clearTimeout(timer);
    }
  };
}
