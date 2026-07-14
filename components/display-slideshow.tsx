"use client";

/* eslint-disable @next/next/no-img-element */

import { startTransition, useEffect, useMemo, useState } from "react";
import { subscribeToPublishedMemories } from "@/lib/memories/client";
import { getPublicMemoryDisplayName } from "@/lib/memory-records";
import type { MemoryRecord } from "@/types/memory";

type DisplaySlideshowProps = {
  initialMemories: MemoryRecord[];
};

function DisplaySlide({
  memory,
  animated = false,
}: {
  memory: MemoryRecord;
  animated?: boolean;
}) {
  const publicName = getPublicMemoryDisplayName(memory);

  return (
    <div className={`absolute inset-0 ${animated ? "display-fade-in" : ""}`}>
      <img
        src={memory.imageUrl}
        alt={publicName}
        className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-[0.38]"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_42%),linear-gradient(180deg,rgba(3,10,24,0.6),rgba(3,10,24,0.22)_18%,rgba(3,10,24,0.14)_62%,rgba(3,10,24,0.72))]" />

      <div className="relative flex h-full flex-col px-4 py-5 text-white sm:px-10 sm:py-10">
        <header className="text-center">
          <p className="display-script text-3xl text-white drop-shadow-[0_10px_28px_rgba(0,0,0,0.28)] sm:text-6xl">
            {publicName}
          </p>
        </header>

        <div className="flex flex-1 items-center justify-center py-4 sm:py-8">
          <div className="flex h-full w-full max-w-[1440px] items-center justify-center rounded-[24px] border border-white/18 bg-white/8 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.25)] backdrop-blur-[3px] sm:rounded-[32px] sm:p-6">
            <img
              src={memory.imageUrl}
              alt={memory.description}
              className="max-h-[52vh] w-auto max-w-full rounded-[18px] object-contain shadow-[0_18px_46px_rgba(0,0,0,0.32)] sm:max-h-[66vh] sm:rounded-[24px]"
            />
          </div>
        </div>

        <footer className="flex justify-center">
          <div className="max-w-5xl rounded-[24px] border border-white/20 bg-black/26 px-4 py-3 text-center shadow-[0_14px_34px_rgba(0,0,0,0.2)] backdrop-blur-md sm:rounded-[28px] sm:px-6 sm:py-4">
            <p className="text-sm font-semibold leading-6 text-white/95 sm:text-2xl sm:leading-10">
              {memory.description}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function DisplaySlideshow({
  initialMemories,
}: DisplaySlideshowProps) {
  const [memories, setMemories] = useState(initialMemories);
  const [activeMemoryId, setActiveMemoryId] = useState<string | null>(
    initialMemories[0]?.id ?? null,
  );
  const [incomingMemoryId, setIncomingMemoryId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToPublishedMemories(
      (nextMemories) => {
        startTransition(() => {
          setMemories(nextMemories);
          setErrorMessage(null);
        });
      },
      (error) => {
        setErrorMessage(error.message);
      },
    );
  }, []);

  const activeIndex = useMemo(() => {
    if (memories.length === 0 || !activeMemoryId) {
      return 0;
    }

    const index = memories.findIndex((memory) => memory.id === activeMemoryId);
    return index >= 0 ? index : 0;
  }, [activeMemoryId, memories]);

  const activeMemory =
    memories.length > 0 ? memories[activeIndex] ?? memories[0] : null;
  const incomingMemory =
    incomingMemoryId
      ? memories.find((memory) => memory.id === incomingMemoryId) ?? null
      : null;

  useEffect(() => {
    if (!activeMemory || memories.length < 2) {
      return;
    }

    const nextMemory = memories[(activeIndex + 1) % memories.length];
    let swapTimer: number | undefined;

    const displayTimer = window.setTimeout(() => {
      setIncomingMemoryId(nextMemory.id);

      swapTimer = window.setTimeout(() => {
        setActiveMemoryId(nextMemory.id);
        setIncomingMemoryId(null);
      }, 900);
    }, 5000);

    return () => {
      window.clearTimeout(displayTimer);

      if (swapTimer !== undefined) {
        window.clearTimeout(swapTimer);
      }
    };
  }, [activeIndex, activeMemory, memories]);

  if (!activeMemory) {
    return (
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 py-10 text-white">
        <div className="max-w-2xl rounded-[32px] border border-white/15 bg-white/8 px-8 py-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.26)] backdrop-blur-md">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-sky-200/80">
            Lobby Display
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.05em]">
            아직 전시할 이미지가 없습니다
          </h1>
          <p className="mt-4 text-lg leading-8 text-white/80">
            응모 2에 등록된 이미지가 생기면 이 화면에 자동으로 반영됩니다.
          </p>
          {errorMessage ? (
            <p className="mt-4 text-sm text-rose-200">{errorMessage}</p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen overflow-hidden bg-slate-950">
      <DisplaySlide memory={activeMemory} />
      {incomingMemory ? (
        <DisplaySlide memory={incomingMemory} animated />
      ) : null}

      <div className="pointer-events-none absolute left-3 top-3 z-20 flex flex-col items-start gap-2 sm:left-8 sm:top-8 sm:flex-row sm:items-center">
        <span className="rounded-full border border-white/18 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-white/90 backdrop-blur-md">
          실시간 전시
        </span>
        <span className="rounded-full border border-white/18 bg-white/10 px-4 py-2 text-xs font-bold text-white/80 backdrop-blur-md">
          총 {memories.length}장
        </span>
      </div>

      {errorMessage ? (
        <div className="absolute left-3 right-3 top-[calc(env(safe-area-inset-top)+4.25rem)] z-20 rounded-[20px] border border-rose-300/30 bg-rose-500/18 px-4 py-2 text-xs font-medium text-rose-50 backdrop-blur-md sm:left-auto sm:right-8 sm:top-8 sm:max-w-sm sm:rounded-full">
          {errorMessage}
        </div>
      ) : null}
    </section>
  );
}
