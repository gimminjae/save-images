type ConfigurationNoticeProps = {
  missingKeys: string[];
};

export function ConfigurationNotice({
  missingKeys,
}: ConfigurationNoticeProps) {
  return (
    <section className="event-panel-strong rounded-[30px] px-5 py-5 text-left sm:px-6">
      <p className="text-xs font-black tracking-[0.08em] text-orange-700">
        설정 필요
      </p>
      <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-slate-950">
        환경변수를 먼저 채워 주세요
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        아래 값이 비어 있어서 아직 페이지와 관리 기능을 정상적으로 시작할 수
        없어요. 프로젝트 루트의 <code>.env</code> 또는 <code>.env.local</code>
        에 값을 넣으면 바로 동작합니다.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {missingKeys.map((key) => (
          <code
            key={key}
            className="rounded-full border border-sky-200/80 bg-white/85 px-3 py-1.5 text-xs font-bold text-slate-800"
          >
            {key}
          </code>
        ))}
      </div>
    </section>
  );
}
