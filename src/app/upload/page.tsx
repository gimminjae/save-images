import { SetupNotice } from "@/components/setup-notice";
import { UploadConsole } from "@/components/upload-console";
import { getCategoryTree } from "@/lib/data/categories";
import { isRuntimeConfigured } from "@/lib/env";

export default async function UploadPage() {
  const categories = await getCategoryTree();

  return (
    <div className="space-y-8 py-10">
      <section className="glass-panel rounded-[32px] px-6 py-8 sm:px-8">
        <p className="eyebrow">Upload Flow</p>
        <h1 className="mt-2 font-[var(--font-display)] text-3xl font-bold sm:text-4xl">
          S3 직접 업로드
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-black/65">
          브라우저가 파일을 직접 S3에 업로드하고, 서버는 Presigned URL 발급과
          메타데이터 저장만 담당합니다. 큰 영상도 서버를 통과하지 않도록
          시작했습니다.
        </p>
      </section>

      {!isRuntimeConfigured() ? (
        <SetupNotice
          title="현재 업로드 실행은 비활성 상태입니다."
          description="`.env.local`에 Supabase와 AWS 값을 추가하면 같은 화면에서 바로 실제 업로드를 진행할 수 있습니다."
        />
      ) : null}

      <section className="glass-panel rounded-[32px] p-6">
        <UploadConsole categories={categories} />
      </section>
    </div>
  );
}
