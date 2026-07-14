import Link from "next/link";

import { getCategoryTree } from "@/lib/data/categories";
import { getRecentMedia } from "@/lib/data/media";

export default async function HomePage() {
  const [categories, recentMedia] = await Promise.all([
    getCategoryTree(),
    getRecentMedia({ limit: 6 }),
  ]);

  return (
    <div className="space-y-10 py-10">
      <section className="glass-panel overflow-hidden rounded-[32px] border px-6 py-8 sm:px-10 sm:py-12">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <p className="eyebrow">Remind Hanmong Archive</p>
            <div className="space-y-4">
              <h1 className="max-w-3xl font-[var(--font-display)] text-4xl font-bold leading-tight sm:text-5xl">
                흩어진 수련회 사진과 영상을
                <span className="text-[var(--accent)]"> 한곳에 다시 모으는</span>{" "}
                아카이브
              </h1>
              <p className="max-w-2xl text-base leading-7 text-black/70 sm:text-lg">
                업로드, 정리, 감상, 다운로드까지 한 흐름으로 연결된 수련회 전용
                미디어 공간입니다. 원본은 안전하게 보관하고, 갤러리는 빠르게
                보여주는 구조로 시작했습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/upload"
                className="rounded-full bg-[var(--accent)] px-5 py-3 font-medium text-white transition hover:bg-[var(--accent-strong)]"
              >
                업로드 시작
              </Link>
              <Link
                href="/gallery"
                className="rounded-full border border-[var(--line)] bg-white/70 px-5 py-3 font-medium text-black/80 transition hover:bg-white"
              >
                전체 갤러리 보기
              </Link>
            </div>
          </div>

          <div className="grid gap-4 rounded-[28px] bg-[#241a12] p-5 text-white">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-white/60">
                현재 구성
              </p>
              <p className="mt-3 font-[var(--font-display)] text-3xl font-semibold">
                {categories.length}개 카테고리
              </p>
            </div>
            <div className="rounded-[24px] bg-white/10 p-4">
              <p className="text-sm text-white/70">최근 업로드</p>
              <p className="mt-1 text-2xl font-semibold">{recentMedia.length}개</p>
            </div>
            <div className="rounded-[24px] border border-white/15 p-4">
              <p className="text-sm leading-6 text-white/70">
                현재 버전은 S3 직접 업로드, 계층형 카테고리, 개별 다운로드 흐름을
                중심으로 구현을 시작했습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="glass-panel rounded-[28px] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="eyebrow">Categories</p>
              <h2 className="mt-2 font-[var(--font-display)] text-2xl font-semibold">
                초기 카테고리 구조
              </h2>
            </div>
            <Link href="/manage/categories" className="text-sm font-medium text-[var(--teal)]">
              관리하기
            </Link>
          </div>
          <div className="space-y-3">
            {categories.slice(0, 6).map((category) => (
              <div
                key={category.id}
                className="rounded-2xl border border-[var(--line)] bg-white/65 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-sm text-black/55">{category.path}</p>
                  </div>
                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                    depth {category.depth}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-[28px] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="eyebrow">Recent Media</p>
              <h2 className="mt-2 font-[var(--font-display)] text-2xl font-semibold">
                최근 등록된 미디어
              </h2>
            </div>
            <Link href="/gallery" className="text-sm font-medium text-[var(--teal)]">
              더 보기
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recentMedia.map((item) => (
              <Link
                key={item.id}
                href={`/media/${item.id}`}
                className="overflow-hidden rounded-[22px] border border-[var(--line)] bg-white/70 transition hover:-translate-y-1"
              >
                <div className="flex aspect-[4/3] items-center justify-center bg-[linear-gradient(135deg,#f4c6a7,#ecd9bc,#b8d6cf)]">
                  <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-black/55">
                    {item.mediaType}
                  </span>
                </div>
                <div className="space-y-2 p-4">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-black/55">{item.originalFilename}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
