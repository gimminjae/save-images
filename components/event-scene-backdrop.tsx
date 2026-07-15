export function EventSceneBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <picture className="absolute inset-0">
        <source
          media="(max-width: 768px)"
          srcSet="/hanmong-night-sky-20260715-mobile.jpg"
        />
        <img
          src="/hanmong-night-sky-20260715-desktop.jpg"
          alt=""
          draggable={false}
          decoding="async"
          className="h-full w-full object-cover object-center"
        />
      </picture>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,16,38,0.08)_0%,rgba(8,16,38,0.14)_28%,rgba(5,12,31,0.34)_56%,rgba(4,9,24,0.68)_82%,rgba(2,6,18,0.82)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_24%,rgba(0,0,0,0)_46%,rgba(3,8,24,0.24)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(180deg,rgba(112,244,255,0),rgba(112,244,255,0.12)_60%,rgba(146,255,205,0.16)_100%)]" />
    </div>
  );
}
