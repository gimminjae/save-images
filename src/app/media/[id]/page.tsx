import { notFound } from "next/navigation";

import { DownloadButton } from "@/components/download-button";
import { getDisplayAssetUrl, getMediaById } from "@/lib/data/media";
import { formatBytes, formatDate } from "@/lib/utils";

export default async function MediaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const media = await getMediaById(id);

  if (!media) {
    notFound();
  }

  const assetUrl = getDisplayAssetUrl(media);

  return (
    <div className="space-y-8 py-10">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel overflow-hidden rounded-[32px]">
          <div className="aspect-[4/3] bg-[linear-gradient(135deg,#f4c6a7,#dbe8e3,#f0e0c5)]">
            {assetUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={assetUrl} alt={media.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black/55">
                  {media.mediaType}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-[32px] p-6">
          <p className="eyebrow">Media Detail</p>
          <h1 className="mt-2 font-[var(--font-display)] text-3xl font-bold">
            {media.title}
          </h1>
          <p className="mt-3 leading-7 text-black/65">
            {media.description ?? "설명이 아직 등록되지 않았습니다."}
          </p>

          <dl className="mt-8 space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-3">
              <dt className="text-sm text-black/55">원본 파일명</dt>
              <dd className="font-medium">{media.originalFilename}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-3">
              <dt className="text-sm text-black/55">업로드일</dt>
              <dd className="font-medium">{formatDate(media.createdAt)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-3">
              <dt className="text-sm text-black/55">파일 크기</dt>
              <dd className="font-medium">{formatBytes(media.fileSize)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-3">
              <dt className="text-sm text-black/55">타입</dt>
              <dd className="font-medium uppercase">{media.mediaType}</dd>
            </div>
          </dl>

          <div className="mt-8">
            <DownloadButton mediaId={media.id} />
          </div>
        </div>
      </section>
    </div>
  );
}
