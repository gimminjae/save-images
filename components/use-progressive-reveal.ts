"use client";

import { useEffect, useRef, useState } from "react";

type ProgressiveRevealOptions = {
  initialCount: number;
  step: number;
};

export function useProgressiveReveal(
  totalCount: number,
  options: ProgressiveRevealOptions,
) {
  const { initialCount, step } = options;
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(totalCount, initialCount),
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const clampedVisibleCount = Math.min(visibleCount, totalCount);
  const hasMore = clampedVisibleCount < totalCount;

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) {
      return;
    }

    const sentinel = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        setVisibleCount((current) => {
          const next = Math.min(totalCount, current + step);
          return next === current ? current : next;
        });
      },
      {
        rootMargin: "900px 0px",
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, step, totalCount]);

  return {
    hasMore,
    sentinelRef,
    visibleCount: clampedVisibleCount,
  };
}
