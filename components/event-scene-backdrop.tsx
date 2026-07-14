export function EventSceneBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-[58%] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.45),transparent_58%)]" />
      <div className="absolute left-[-4rem] top-16 h-36 w-36 rounded-full bg-white/35 blur-2xl sm:h-56 sm:w-56" />
      <div className="absolute right-[-2rem] top-28 h-28 w-28 rounded-full bg-sky-100/55 blur-2xl sm:h-44 sm:w-44" />
      <div className="absolute left-[12%] top-24 h-10 w-28 rounded-full bg-white/65 blur-md sm:h-12 sm:w-40" />
      <div className="absolute right-[14%] top-20 h-12 w-24 rounded-full bg-white/55 blur-md sm:h-14 sm:w-36" />
      <div className="absolute left-[20%] top-44 h-6 w-20 rounded-full bg-white/50 blur-md sm:w-28" />
      <div className="absolute inset-x-0 bottom-0 h-[30vh] bg-[linear-gradient(180deg,rgba(178,245,255,0),rgba(169,241,196,0.28)_30%,rgba(112,213,91,0.56)_100%)]" />
      <div className="absolute bottom-[-5rem] left-[-8%] h-44 w-[62%] rounded-[50%] bg-[#9fe96f]/75 blur-[2px] sm:h-56" />
      <div className="absolute bottom-[-4.5rem] right-[-10%] h-48 w-[68%] rounded-[50%] bg-[#79d95f]/75 blur-[2px] sm:h-60" />
      <div className="absolute bottom-10 left-[8%] h-24 w-24 rounded-full bg-white/15 blur-3xl sm:h-32 sm:w-32" />
      <div className="absolute bottom-20 right-[10%] h-20 w-20 rounded-full bg-white/15 blur-3xl sm:h-28 sm:w-28" />
    </div>
  );
}
