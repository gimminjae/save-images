import Link from "next/link";

import { getDisplayAssetUrl } from "@/lib/data/media";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import type { MediaItem } from "@/types/domain";

export function MediaCard({
  item,
  compact = false,
}: {
  item: MediaItem;
  compact?: boolean;
}) {
  const assetUrl = getDisplayAssetUrl(item);

  return (
    <Link
      href={`/media/${item.id}`}
      className="group overflow-hidden rounded-[24px] border border-[var(--line)] bg-white/70 transition hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(47,31,18,0.12)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[linear-gradient(135deg,#f4c6a7,#dbe8e3,#f0e0c5)]">
        {assetUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetUrl}
            alt={item.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="rounded-full border border-black/8 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-black/60">
              {item.mediaType}
            </span>
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-full bg-[#241a12]/78 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
          {item.mediaType}
        </div>
      </div>
      <div className={cn("space-y-3 p-4", compact && "p-3")}>
        <div>
          <p className="font-semibold">{item.title}</p>
          <p className="mt-1 text-sm text-black/55">{item.originalFilename}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-black/50">
          <span>{formatDate(item.createdAt)}</span>
          <span>•</span>
          <span>{formatBytes(item.fileSize)}</span>
        </div>
      </div>
    </Link>
  );
}
