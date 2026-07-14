"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState } from "react";

type FloatingUploadButtonProps = {
  hidden?: boolean;
};

const FADE_OUT_DELAY_MS = 1400;

export function FloatingUploadButton({
  hidden = false,
}: FloatingUploadButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const clearHideTimeout = useEffectEvent(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  });

  const showButton = useEffectEvent(() => {
    if (hidden) {
      return;
    }

    setIsVisible(true);
    clearHideTimeout();

    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
      timeoutRef.current = null;
    }, FADE_OUT_DELAY_MS);
  });

  useEffect(() => {
    if (hidden) {
      clearHideTimeout();
      return;
    }

    const handleScroll = () => {
      showButton();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("touchmove", handleScroll, { passive: true });

    return () => {
      clearHideTimeout();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("touchmove", handleScroll);
    };
  }, [hidden]);

  return (
    <Link
      href="/upload"
      aria-label="이미지 업로드"
      className={`fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-white/80 bg-[linear-gradient(180deg,#5fd7ff_0%,#2ba7ff_100%)] text-3xl font-black leading-none text-white shadow-[0_18px_36px_rgba(15,97,166,0.28)] backdrop-blur-md transition-all duration-500 sm:bottom-8 sm:right-8 sm:h-16 sm:w-16 ${
        !hidden && isVisible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <span className="-mt-0.5">+</span>
    </Link>
  );
}
