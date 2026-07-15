"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { LuHouse, LuImage, LuPlus } from "react-icons/lu";

type FloatingUploadButtonProps = {
  currentPath: string;
};

const FADE_OUT_DELAY_MS = 2200;
const navItems = [
  { href: "/", icon: LuHouse, ariaLabel: "홈" },
  { href: "/gallery", icon: LuImage, ariaLabel: "이미지" },
  { href: "/upload", icon: LuPlus, ariaLabel: "이미지 업로드" },
];

export function FloatingUploadButton({
  currentPath,
}: FloatingUploadButtonProps) {
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef<number | null>(null);

  const clearHideTimeout = useEffectEvent(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  });

  const showButton = useEffectEvent(() => {
    setIsVisible(true);
    clearHideTimeout();

    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
      timeoutRef.current = null;
    }, FADE_OUT_DELAY_MS);
  });

  useEffect(() => {
    clearHideTimeout();
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
      timeoutRef.current = null;
    }, FADE_OUT_DELAY_MS);

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
  }, []);

  function isActive(href: string) {
    if (href === "/") {
      return currentPath === "/";
    }

    return currentPath.startsWith(href);
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2 transition-all duration-500 sm:bottom-8 sm:right-8 ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      {navItems.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.ariaLabel}
            className={`inline-flex h-14 w-14 items-center justify-center rounded-full border text-[1.55rem] leading-none shadow-[0_18px_36px_rgba(8,18,44,0.24)] backdrop-blur-md transition hover:-translate-y-0.5 sm:h-16 sm:w-16 sm:text-[1.75rem] ${
              active
                ? "border-white/95 bg-white text-slate-950 ring-2 ring-white/55 shadow-[0_18px_36px_rgba(255,255,255,0.16)]"
                : "border-white/75 bg-white/82 text-slate-950 shadow-[0_18px_36px_rgba(8,18,44,0.16)]"
            }`}
          >
            <Icon className="h-[1.45rem] w-[1.45rem] sm:h-[1.65rem] sm:w-[1.65rem]" />
          </Link>
        );
      })}
    </div>
  );
}
