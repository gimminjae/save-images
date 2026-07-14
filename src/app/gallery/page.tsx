import { MediaCard } from "@/components/media-card";
import { SetupNotice } from "@/components/setup-notice";
import { listMedia } from "@/lib/data/media";
import { isRuntimeConfigured } from "@/lib/env";

export default async function GalleryPage() {
  const media = await listMedia({ limit: 24 });

  return (
    <div className="space-y-8 py-10">
      <section className="glass-panel rounded-[32px] px-6 py-8 sm:px-8">
        <p className="eyebrow">Gallery</p>
        <h1 className="mt-2 font-[var(--font-display)] text-3xl font-bold sm:text-4xl">
          전체 갤러리
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-black/65">
          이미지와 영상을 한 공간에서 탐색할 수 있도록 기본 갤러리 구조를
          구현했습니다. 현재는 최신 업로드 기준으로 정렬됩니다.
        </p>
      </section>

      {!isRuntimeConfigured() ? (
        <SetupNotice
          title="현재는 데모 데이터로 렌더링 중입니다."
          description="`.env.local`에 Supabase와 S3 값을 채우면 실제 데이터 기반 업로드/조회 흐름으로 바로 전환됩니다."
        />
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {media.map((item) => (
          <MediaCard key={item.id} item={item} />
        ))}
      </section>
    </div>
  );
}
