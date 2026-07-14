/* eslint-disable @next/next/no-img-element */

import { getPublicMemoryDisplayName } from "@/lib/memory-records";
import type { MemoryRecord } from "@/types/memory";

type MemoryCardProps = {
  memory: MemoryRecord;
  onSelect: (memory: MemoryRecord) => void;
};

export function MemoryCard({ memory, onSelect }: MemoryCardProps) {
  const publicName = getPublicMemoryDisplayName(memory);

  return (
    <button
      type="button"
      onClick={() => onSelect(memory)}
      className="group relative aspect-square w-full overflow-hidden rounded-[28px] bg-white text-left shadow-[0_18px_34px_rgba(25,102,165,0.12)] ring-1 ring-sky-100/80 transition hover:-translate-y-1 hover:shadow-[0_24px_42px_rgba(25,102,165,0.18)]"
    >
      <img
        src={memory.imageUrl}
        alt={publicName}
        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        loading="lazy"
      />
    </button>
  );
}
