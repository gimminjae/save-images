import Link from "next/link";

import { SetupNotice } from "@/components/setup-notice";
import { getCategoryTree } from "@/lib/data/categories";
import { listMedia } from "@/lib/data/media";
import { isRuntimeConfigured } from "@/lib/env";
import { formatBytes } from "@/lib/utils";

export default async function ManagePage() {
  const [categories, media] = await Promise.all([
    getCategoryTree(),
    listMedia({ limit: 8 }),
  ]);

  const totalSize = media.reduce((acc, item) => acc + item.fileSize, 0);

  return (
    <div className="space-y-8 py-10">
      <section className="glass-panel rounded-[32px] px-6 py-8 sm:px-8">
        <p className="eyebrow">Manage</p>
        <h1 className="mt-2 font-[var(--font-display)] text-3xl font-bold sm:text-4xl">
          운영 대시보드 시작점
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-black/65">
          1차 버전에서는 전체 미디어 현황, 저장량 요약, 카테고리 구조 확인부터
          시작합니다. 수정/삭제 API도 함께 준비했습니다.
        </p>
      </section>

      {!isRuntimeConfigured() ? (
        <SetupNotice
          title="현재는 데모 데이터를 보여주고 있습니다."
          description="실제 운영 데이터를 보려면 `.env.local`을 설정한 뒤 빌드를 다시 실행해 주세요."
        />
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass-panel rounded-[28px] p-5">
          <p className="text-sm text-black/55">카테고리 수</p>
          <p className="mt-2 font-[var(--font-display)] text-4xl font-bold">
            {categories.length}
          </p>
        </div>
        <div className="glass-panel rounded-[28px] p-5">
          <p className="text-sm text-black/55">최근 표시 미디어</p>
          <p className="mt-2 font-[var(--font-display)] text-4xl font-bold">
            {media.length}
          </p>
        </div>
        <div className="glass-panel rounded-[28px] p-5">
          <p className="text-sm text-black/55">표시 중 저장량</p>
          <p className="mt-2 font-[var(--font-display)] text-4xl font-bold">
            {formatBytes(totalSize)}
          </p>
        </div>
      </section>

      <section className="glass-panel rounded-[28px] p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-[var(--font-display)] text-2xl font-semibold">
              빠른 이동
            </h2>
            <p className="mt-1 text-sm text-black/55">
              운영용 화면과 API가 이 흐름을 기준으로 연결됩니다.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/manage/categories"
            className="rounded-[24px] border border-[var(--line)] bg-white/70 p-5 transition hover:-translate-y-1"
          >
            <p className="font-semibold">카테고리 관리</p>
            <p className="mt-2 text-sm leading-6 text-black/55">
              계층형 구조 확인, 생성/수정/삭제 API 사용 기준 정리
            </p>
          </Link>
          <Link
            href="/gallery"
            className="rounded-[24px] border border-[var(--line)] bg-white/70 p-5 transition hover:-translate-y-1"
          >
            <p className="font-semibold">공개 갤러리 확인</p>
            <p className="mt-2 text-sm leading-6 text-black/55">
              업로드 후 노출되는 결과와 목록 구성을 검증
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
