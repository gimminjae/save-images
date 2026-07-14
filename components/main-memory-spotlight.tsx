"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { MemoryDetailModal } from "@/components/memory-detail-modal";
import { getPublicMemoryDisplayName } from "@/lib/memory-records";
import type { MemoryRecord } from "@/types/memory";

type MainMemorySpotlightProps = {
  emptyMessage: string;
  memories: MemoryRecord[];
};

function getCardLayoutClassName(index: number) {
  switch (index % 6) {
    case 0:
      return "sm:translate-y-5";
    case 1:
      return "lg:-translate-y-4";
    case 2:
      return "xl:translate-y-8";
    case 3:
      return "sm:-translate-y-2";
    case 4:
      return "lg:translate-y-4";
    default:
      return "";
  }
}

export function MainMemorySpotlight({
  emptyMessage,
  memories,
}: MainMemorySpotlightProps) {
  const [selectedMemory, setSelectedMemory] = useState<MemoryRecord | null>(
    null,
  );
  const [memoryOverrides, setMemoryOverrides] = useState<
    Record<string, MemoryRecord>
  >({});
  const [hiddenMemoryIds, setHiddenMemoryIds] = useState<Record<string, true>>(
    {},
  );

  const displayedMemories = useMemo(
    () =>
      memories
        .filter((memory) => hiddenMemoryIds[memory.id] !== true)
        .map((memory) => memoryOverrides[memory.id] ?? memory),
    [hiddenMemoryIds, memories, memoryOverrides],
  );

  if (displayedMemories.length === 0) {
    return (
      <div className="rounded-[30px] border border-dashed border-sky-200/80 bg-white/70 px-5 py-12 text-center text-sm font-bold text-slate-600">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-5 top-0 h-20 rounded-full bg-white/35 blur-3xl sm:inset-x-10 sm:h-24" />
        <div className="columns-2 gap-2.5 sm:gap-5 lg:columns-3 xl:columns-4">
          {displayedMemories.map((memory, index) => {
            const publicName = getPublicMemoryDisplayName(memory);
            const ratio =
              memory.imageWidth && memory.imageHeight
                ? `${memory.imageWidth} / ${memory.imageHeight}`
                : "4 / 5";

            return (
              <div
                key={memory.id}
                className={`mb-2.5 break-inside-avoid sm:mb-5 ${getCardLayoutClassName(index)}`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedMemory(memory)}
                  className="group block w-full overflow-hidden rounded-[18px] border border-white/80 bg-white/90 p-1 text-left shadow-[0_20px_40px_rgba(15,76,129,0.12)] ring-1 ring-sky-100/70 transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_48px_rgba(15,76,129,0.18)] sm:rounded-[32px]"
                >
                  <div
                    className="overflow-hidden rounded-[14px] bg-[linear-gradient(180deg,rgba(232,251,255,0.95),rgba(255,255,255,0.78))] sm:rounded-[24px]"
                    style={{ aspectRatio: ratio }}
                  >
                    <img
                      src={memory.imageUrl}
                      alt={publicName}
                      width={memory.imageWidth}
                      height={memory.imageHeight}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                      loading="lazy"
                    />
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <MemoryDetailModal
        key={selectedMemory?.id ?? "memory-detail-empty"}
        memory={selectedMemory}
        onClose={() => setSelectedMemory(null)}
        onUpdated={(updatedMemory) => {
          setSelectedMemory(updatedMemory);
          setMemoryOverrides((current) => ({
            ...current,
            [updatedMemory.id]: updatedMemory,
          }));

          if (updatedMemory.isMainFeatured) {
            setHiddenMemoryIds((current) => {
              if (!(updatedMemory.id in current)) {
                return current;
              }

              const next = { ...current };
              delete next[updatedMemory.id];
              return next;
            });
            return;
          }

          setHiddenMemoryIds((current) => ({
            ...current,
            [updatedMemory.id]: true,
          }));
        }}
      />
    </>
  );
}
