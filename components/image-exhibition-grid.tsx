"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { MemoryDetailModal } from "@/components/memory-detail-modal";
import type { MemoryRecord } from "@/types/memory";

type ImageExhibitionGridProps = {
  emptyMessage: string;
  memories: MemoryRecord[];
};

function getTileClassName(index: number) {
  if (index === 0) {
    return "md:col-span-2 md:row-span-2";
  }

  if (index % 5 === 2) {
    return "md:row-span-2";
  }

  if (index % 6 === 4) {
    return "md:col-span-2";
  }

  return "";
}

export function ImageExhibitionGrid({
  emptyMessage,
  memories,
}: ImageExhibitionGridProps) {
  const [selectedMemory, setSelectedMemory] = useState<MemoryRecord | null>(
    null,
  );

  if (memories.length === 0) {
    return (
      <div className="event-panel-strong rounded-[28px] px-5 py-10 text-center text-sm font-bold text-slate-600">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 auto-rows-[120px] gap-3 sm:auto-rows-[220px] sm:gap-4 lg:grid-cols-4 lg:auto-rows-[230px]">
        {memories.map((memory, index) => (
          <button
            key={memory.id}
            type="button"
            onClick={() => setSelectedMemory(memory)}
            className={`group relative overflow-hidden rounded-[18px] border border-white/70 bg-white text-left shadow-[0_18px_34px_rgba(25,102,165,0.12)] transition hover:-translate-y-1 hover:shadow-[0_24px_42px_rgba(25,102,165,0.18)] sm:rounded-[28px] ${getTileClassName(index)}`}
          >
            <img
              src={memory.imageUrl}
              alt={memory.name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,23,42,0.02),rgba(6,23,42,0.16),rgba(6,23,42,0.7))]" />
            <div className="absolute inset-x-0 bottom-0 p-3 text-white sm:p-4">
              {memory.category?.name ? (
                <p className="text-xs font-black tracking-[0.08em] text-white/75">
                  {memory.category.name}
                </p>
              ) : null}
            </div>
          </button>
        ))}
      </div>

      <MemoryDetailModal
        key={selectedMemory?.id ?? "memory-detail-empty"}
        memory={selectedMemory}
        onClose={() => setSelectedMemory(null)}
        onUpdated={(updatedMemory) => setSelectedMemory(updatedMemory)}
      />
    </>
  );
}
