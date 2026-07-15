import Galaxy from "@/components/galaxy";
import { SiteShell } from "@/components/site-shell";

const customPropLabels = [
  "mouseRepulsion={false}",
  "mouseInteraction",
  "density={1}",
  "glowIntensity={0.3}",
  "saturation={0}",
  "hueShift={140}",
  "twinkleIntensity={0.3}",
  "rotationSpeed={0.05}",
  "repulsionStrength={2}",
  "autoCenterRepulsion={0}",
  "starSpeed={0.5}",
  "speed={1}",
];

export default function GalaxyPage() {
  return (
    <SiteShell
      currentPath="/galaxy"
      showBackdrop={false}
      fullBleed
      mainClassName="bg-[#03040d]"
    >
      <section className="px-3 py-3 sm:px-6 sm:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <header className="rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-5 text-white shadow-[0_18px_48px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:px-7 sm:py-7">
            <p className="text-xs font-black tracking-[0.28em] text-white/62 uppercase">
              OGL Galaxy
            </p>
            <h1 className="mt-3 text-[clamp(2rem,5vw,4rem)] font-black tracking-[-0.07em] text-white">
              /galaxy
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/72 sm:text-base">
              첨부해주신 `Galaxy` usage와 shader 코드를 기준으로, 기본
              버전과 custom props 버전을 바로 확인할 수 있게 구성했습니다.
            </p>
          </header>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-3 shadow-[0_18px_48px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3 px-2">
                <div>
                  <p className="text-xs font-black tracking-[0.24em] text-white/58 uppercase">
                    Basic Usage
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white/76">
                    `<Galaxy />`
                  </p>
                </div>
              </div>

              <div className="relative h-[60vh] min-h-[420px] overflow-hidden rounded-[26px] border border-white/10 bg-[#02030a]">
                <Galaxy />
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-3 shadow-[0_18px_48px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-4">
              <div className="mb-3 px-2">
                <p className="text-xs font-black tracking-[0.24em] text-white/58 uppercase">
                  Custom Props
                </p>
                <p className="mt-1 text-sm font-semibold text-white/76">
                  attached usage preset
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {customPropLabels.map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[0.7rem] font-bold text-white/72"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="relative h-[60vh] min-h-[420px] overflow-hidden rounded-[26px] border border-white/10 bg-[#02030a]">
                <Galaxy
                  mouseRepulsion={false}
                  mouseInteraction
                  density={1}
                  glowIntensity={0.3}
                  saturation={0}
                  hueShift={140}
                  twinkleIntensity={0.3}
                  rotationSpeed={0.05}
                  repulsionStrength={2}
                  autoCenterRepulsion={0}
                  starSpeed={0.5}
                  speed={1}
                />
              </div>
            </section>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
