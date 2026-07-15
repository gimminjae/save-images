"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { MemoryDetailModal } from "@/components/memory-detail-modal";
import { useProgressiveReveal } from "@/components/use-progressive-reveal";
import { getPublicMemoryDisplayName } from "@/lib/memory-records";
import type { MemoryRecord } from "@/types/memory";

type MainMemorySpotlightProps = {
  emptyMessage: string;
  memories: MemoryRecord[];
  syncMainFeatureVisibility?: boolean;
  allowMainFeatureToggle?: boolean;
};

function getCardLayoutClassName(index: number) {
  switch (index % 8) {
    case 0:
      return "sm:mt-8 xl:mt-12";
    case 1:
      return "lg:mt-6 2xl:mt-10";
    case 2:
      return "sm:mt-3 xl:mt-16";
    case 3:
      return "lg:mt-10";
    case 4:
      return "sm:mt-10 xl:mt-4";
    case 5:
      return "2xl:mt-14";
    case 6:
      return "sm:mt-4 lg:mt-12";
    default:
      return "";
  }
}

function getCardTiltClassName(index: number) {
  switch (index % 10) {
    case 0:
      return "rotate-[-0.8deg] sm:rotate-[-1.2deg]";
    case 1:
      return "rotate-[0.6deg] sm:rotate-[1deg]";
    case 2:
      return "rotate-[-0.4deg] sm:rotate-[-0.9deg]";
    case 3:
      return "rotate-[0.9deg] sm:rotate-[1.3deg]";
    case 4:
      return "rotate-[-0.6deg] sm:rotate-[-1deg]";
    case 5:
      return "rotate-[0.4deg] sm:rotate-[0.8deg]";
    case 6:
      return "rotate-[-0.9deg] sm:rotate-[-1.4deg]";
    case 7:
      return "rotate-[0.7deg] sm:rotate-[1.1deg]";
    case 8:
      return "rotate-[-0.5deg] sm:rotate-[-0.8deg]";
    default:
      return "rotate-[0.3deg] sm:rotate-[0.7deg]";
  }
}

export function MainMemorySpotlight({
  emptyMessage,
  memories,
  syncMainFeatureVisibility = false,
  allowMainFeatureToggle = true,
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
  const { hasMore, sentinelRef, visibleCount } = useProgressiveReveal(
    displayedMemories.length,
    {
      initialCount: 20,
      step: 15,
    },
  );
  const visibleMemories = displayedMemories.slice(0, visibleCount);

  if (displayedMemories.length === 0) {
    return (
      <div className="rounded-[30px] border border-dashed border-sky-200/80 bg-white/70 px-5 py-12 text-center text-sm font-bold text-slate-600">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <div className="relative mx-auto w-full max-w-[1680px]">
        <div className="grid grid-cols-2 items-start gap-x-3 gap-y-5 sm:gap-x-6 sm:gap-y-8 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {visibleMemories.map((memory, index) => {
            const publicName = getPublicMemoryDisplayName(memory);
            const hasKnownDimensions =
              typeof memory.imageWidth === "number" &&
              typeof memory.imageHeight === "number" &&
              memory.imageWidth > 0 &&
              memory.imageHeight > 0;
            const ratio = hasKnownDimensions
              ? `${memory.imageWidth} / ${memory.imageHeight}`
              : undefined;

            return (
              <div
                key={memory.id}
                className={`self-start ${getCardLayoutClassName(index)}`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedMemory(memory)}
                  className={`group block w-full overflow-hidden bg-transparent p-0 text-left shadow-[0_20px_40px_rgba(8,18,44,0.2)] transition duration-300 hover:-translate-y-1 hover:rotate-0 hover:shadow-[0_30px_48px_rgba(8,18,44,0.28)] ${getCardTiltClassName(index)}`}
                >
                  <div
                    className="overflow-hidden bg-transparent"
                    style={ratio ? { aspectRatio: ratio } : undefined}
                  >
                    <img
                      src={memory.thumbnailUrl ?? memory.imageUrl}
                      alt={publicName}
                      width={memory.imageWidth}
                      height={memory.imageHeight}
                      loading={index < 5 ? "eager" : "lazy"}
                      decoding="async"
                      className={`block w-full transition duration-500 group-hover:scale-[1.025] ${
                        hasKnownDimensions
                          ? "h-full object-cover"
                          : "h-auto object-contain"
                      }`}
                    />
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {hasMore ? (
          <div
            ref={sentinelRef}
            aria-hidden="true"
            className="mt-5 h-8 w-full rounded-full"
          />
        ) : null}
      </div>

      <MemoryDetailModal
        key={selectedMemory?.id ?? "memory-detail-empty"}
        memory={selectedMemory}
        onClose={() => setSelectedMemory(null)}
        allowMainFeatureToggle={allowMainFeatureToggle}
        onUpdated={(updatedMemory) => {
          setSelectedMemory(updatedMemory);
          setMemoryOverrides((current) => ({
            ...current,
            [updatedMemory.id]: updatedMemory,
          }));

          if (!syncMainFeatureVisibility) {
            return;
          }

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
