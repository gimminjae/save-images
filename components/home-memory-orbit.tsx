"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RiShuffleLine } from "react-icons/ri";
import { MemoryDetailModal } from "@/components/memory-detail-modal";
import { getPublicMemoryDisplayName } from "@/lib/memory-records";
import type { MemoryRecord } from "@/types/memory";

type HomeMemoryOrbitProps = {
  emptyMessage?: string;
  isLoading?: boolean;
  memories: MemoryRecord[];
};

type OrbitSlot = {
  id: string;
  left: number;
  top: number;
  rotation: number;
  width: string;
  zIndex: number;
};

type SlotAssignment = {
  memory: MemoryRecord;
  slot: OrbitSlot;
};

const MAX_VISIBLE_MEMORIES = 15;
const SHUFFLE_DURATION_MS = 820;
const SLOT_SELECTION_ORDER = [0, 5, 10, 14, 6, 7, 12, 1, 4, 8, 9, 2, 3, 11, 13];

const ORBIT_SLOTS: OrbitSlot[] = [
  { id: "north-west-outer", left: 14, top: 16, rotation: -8, width: "clamp(130px, 16.3vw, 284px)", zIndex: 2 },
  { id: "north-west-inner", left: 29, top: 11, rotation: 6, width: "clamp(118px, 14.6vw, 252px)", zIndex: 1 },
  { id: "north-center-left", left: 43, top: 9, rotation: -4, width: "clamp(110px, 13.2vw, 226px)", zIndex: 1 },
  { id: "north-center-right", left: 57, top: 9, rotation: 5, width: "clamp(110px, 13.2vw, 226px)", zIndex: 1 },
  { id: "north-east-inner", left: 71, top: 11, rotation: -6, width: "clamp(118px, 14.6vw, 252px)", zIndex: 1 },
  { id: "north-east-outer", left: 86, top: 16, rotation: 8, width: "clamp(130px, 16.3vw, 284px)", zIndex: 2 },
  { id: "west-upper", left: 12, top: 35, rotation: -7, width: "clamp(122px, 15.6vw, 264px)", zIndex: 3 },
  { id: "east-upper", left: 88, top: 35, rotation: 7, width: "clamp(122px, 15.6vw, 264px)", zIndex: 3 },
  { id: "west-lower", left: 11, top: 63, rotation: 5, width: "clamp(132px, 17vw, 286px)", zIndex: 4 },
  { id: "east-lower", left: 89, top: 63, rotation: -5, width: "clamp(132px, 17vw, 286px)", zIndex: 4 },
  { id: "south-west-outer", left: 15, top: 84, rotation: 7, width: "clamp(137px, 17.5vw, 298px)", zIndex: 5 },
  { id: "south-west-inner", left: 31, top: 89, rotation: -6, width: "clamp(120px, 14.6vw, 257px)", zIndex: 4 },
  { id: "south-center", left: 50, top: 91, rotation: 2, width: "clamp(127px, 16.1vw, 271px)", zIndex: 5 },
  { id: "south-east-inner", left: 69, top: 89, rotation: 6, width: "clamp(120px, 14.6vw, 257px)", zIndex: 4 },
  { id: "south-east-outer", left: 85, top: 84, rotation: -7, width: "clamp(137px, 17.5vw, 298px)", zIndex: 5 },
];

function createSeededRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let next = state;

    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);

    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function hashMemories(memories: MemoryRecord[]) {
  const text = memories.map((memory) => memory.id).join("|");
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function shuffleWithSeed<T>(items: T[], seed: number) {
  const shuffled = [...items];
  const random = createSeededRandom(seed);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    const current = shuffled[index];

    shuffled[index] = shuffled[randomIndex];
    shuffled[randomIndex] = current;
  }

  return shuffled;
}

function areAssignmentsSame(left: SlotAssignment[], right: SlotAssignment[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every(
    (assignment, index) =>
      assignment.memory.id === right[index]?.memory.id &&
      assignment.slot.id === right[index]?.slot.id,
  );
}

function buildAssignments(memories: MemoryRecord[], seed: number) {
  const visibleCount = Math.min(memories.length, MAX_VISIBLE_MEMORIES);
  const visibleSlots = SLOT_SELECTION_ORDER.slice(0, visibleCount).map(
    (slotIndex) => ORBIT_SLOTS[slotIndex],
  );
  const shuffledMemories = shuffleWithSeed(memories, seed).slice(0, visibleCount);

  return visibleSlots.map((slot, index) => ({
    memory: shuffledMemories[index],
    slot,
  }));
}

function getNextAssignments(
  memories: MemoryRecord[],
  currentAssignments: SlotAssignment[],
  baseSeed: number,
  version: number,
) {
  let attempt = 0;
  let nextAssignments = currentAssignments;

  while (attempt < 6) {
    nextAssignments = buildAssignments(
      memories,
      baseSeed + (version + attempt + 1) * 7919,
    );

    if (!areAssignmentsSame(currentAssignments, nextAssignments)) {
      return nextAssignments;
    }

    attempt += 1;
  }

  return nextAssignments;
}

function getActiveLayerClasses(isAnimating: boolean, showIncoming: boolean) {
  if (!isAnimating || !showIncoming) {
    return "opacity-100 translate-y-0 scale-100 blur-0";
  }

  return "opacity-0 translate-y-5 scale-[0.94] blur-[1.6px]";
}

function getIncomingLayerClasses(showIncoming: boolean) {
  if (!showIncoming) {
    return "opacity-0 -translate-y-5 scale-[0.94] blur-[1.6px]";
  }

  return "opacity-100 translate-y-0 scale-100 blur-0";
}

export function HomeMemoryOrbit({
  memories,
  isLoading = false,
  emptyMessage = "메인 전시 이미지가 없습니다.",
}: HomeMemoryOrbitProps) {
  const [selectedMemory, setSelectedMemory] = useState<MemoryRecord | null>(null);
  const [hoveredAssignmentKey, setHoveredAssignmentKey] = useState<string | null>(
    null,
  );
  const [shuffleVersion, setShuffleVersion] = useState(0);
  const featuredMemories = useMemo(
    () => memories.filter((memory) => memory.isMainFeatured === true),
    [memories],
  );
  const baseSeed = useMemo(() => hashMemories(featuredMemories), [featuredMemories]);
  const initialAssignments = useMemo(
    () => buildAssignments(featuredMemories, baseSeed),
    [baseSeed, featuredMemories],
  );
  const [activeAssignments, setActiveAssignments] = useState<SlotAssignment[]>(
    initialAssignments,
  );
  const [incomingAssignments, setIncomingAssignments] =
    useState<SlotAssignment[] | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showIncoming, setShowIncoming] = useState(false);
  const frameRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearScheduledShuffle = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    return () => {
      clearScheduledShuffle();
    };
  }, [clearScheduledShuffle]);

  function handleShuffle() {
    if (
      isLoading ||
      isAnimating ||
      featuredMemories.length === 0 ||
      typeof window === "undefined"
    ) {
      return;
    }

    clearScheduledShuffle();

    const nextVersion = shuffleVersion + 1;
    const nextAssignments = getNextAssignments(
      featuredMemories,
      activeAssignments,
      baseSeed,
      nextVersion,
    );

    setShuffleVersion(nextVersion);
    setHoveredAssignmentKey(null);
    setIncomingAssignments(nextAssignments);
    setIsAnimating(true);
    setShowIncoming(false);

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = window.requestAnimationFrame(() => {
        setShowIncoming(true);
        frameRef.current = null;
      });
    });

    timeoutRef.current = window.setTimeout(() => {
      setActiveAssignments(nextAssignments);
      setIncomingAssignments(null);
      setIsAnimating(false);
      setShowIncoming(false);
      timeoutRef.current = null;
    }, SHUFFLE_DURATION_MS);
  }

  const hasMemories = activeAssignments.length > 0;
  const orbitAssignments = hasMemories ? activeAssignments : [];
  const placeholderSlots = SLOT_SELECTION_ORDER.slice(0, MAX_VISIBLE_MEMORIES).map(
    (slotIndex) => ORBIT_SLOTS[slotIndex],
  );

  return (
    <>
      <section className="relative flex min-h-[100svh] w-full items-center justify-center">
        <div className="relative h-[min(92svh,1040px)] min-h-[620px] w-full max-w-[1820px] sm:min-h-[720px]">
          {isLoading
            ? placeholderSlots.map((slot, index) => (
                <div
                  key={slot.id}
                  className="absolute"
                  style={{
                    left: `${slot.left}%`,
                    top: `${slot.top}%`,
                    transform: `translate(-50%, -50%) rotate(${slot.rotation}deg)`,
                    zIndex: slot.zIndex,
                  }}
                >
                  <div
                    className="overflow-hidden rounded-[8px] bg-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.2)] ring-1 ring-white/10 animate-pulse"
                    style={{
                      width: slot.width,
                      aspectRatio: index % 3 === 0 ? "4 / 5" : "5 / 4",
                    }}
                  />
                </div>
              ))
            : null}

          {!isLoading
            ? orbitAssignments.map((assignment, index) => {
                const assignmentKey = `${assignment.slot.id}-${assignment.memory.id}`;
                const isHovered = hoveredAssignmentKey === assignmentKey;
                const publicName = getPublicMemoryDisplayName(assignment.memory);
                const hasKnownDimensions =
                  typeof assignment.memory.imageWidth === "number" &&
                  typeof assignment.memory.imageHeight === "number" &&
                  assignment.memory.imageWidth > 0 &&
                  assignment.memory.imageHeight > 0;
                const aspectRatio = hasKnownDimensions
                  ? `${assignment.memory.imageWidth} / ${assignment.memory.imageHeight}`
                  : undefined;

                return (
                  <div
                    key={`active-${assignment.slot.id}-${assignment.memory.id}`}
                    className={`absolute transition-[opacity,transform,filter] duration-[820ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isAnimating ? "pointer-events-none" : ""
                    }`}
                    style={{
                      left: `${assignment.slot.left}%`,
                      top: `${assignment.slot.top}%`,
                      transform: `translate(-50%, -50%) rotate(${assignment.slot.rotation}deg)`,
                      zIndex: isHovered ? 120 : assignment.slot.zIndex,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedMemory(assignment.memory)}
                      onMouseEnter={() => setHoveredAssignmentKey(assignmentKey)}
                      onMouseLeave={() => {
                        setHoveredAssignmentKey((current) =>
                          current === assignmentKey ? null : current,
                        );
                      }}
                      aria-label={`${publicName} 상세 보기`}
                      className={`group block overflow-hidden bg-transparent p-0 text-left shadow-[0_26px_60px_rgba(0,0,0,0.22)] transition-[opacity,transform,filter,box-shadow] duration-[820ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_34px_72px_rgba(0,0,0,0.28)] ${getActiveLayerClasses(isAnimating, showIncoming)}`}
                      style={{
                        width: assignment.slot.width,
                      }}
                    >
                      <div className="overflow-hidden" style={{ aspectRatio }}>
                        <img
                          src={assignment.memory.thumbnailUrl ?? assignment.memory.imageUrl}
                          alt={publicName}
                          width={assignment.memory.imageWidth}
                          height={assignment.memory.imageHeight}
                          loading={index < 6 ? "eager" : "lazy"}
                          decoding="async"
                          className={`block w-full transition duration-700 group-hover:scale-[1.03] ${
                            hasKnownDimensions
                              ? "h-full object-cover"
                              : "h-auto"
                          }`}
                        />
                      </div>
                    </button>
                  </div>
                );
              })
            : null}

          {!isLoading && incomingAssignments
            ? incomingAssignments.map((assignment, index) => {
                const publicName = getPublicMemoryDisplayName(assignment.memory);
                const hasKnownDimensions =
                  typeof assignment.memory.imageWidth === "number" &&
                  typeof assignment.memory.imageHeight === "number" &&
                  assignment.memory.imageWidth > 0 &&
                  assignment.memory.imageHeight > 0;
                const aspectRatio = hasKnownDimensions
                  ? `${assignment.memory.imageWidth} / ${assignment.memory.imageHeight}`
                  : undefined;

                return (
                  <div
                    key={`incoming-${assignment.slot.id}-${assignment.memory.id}`}
                    className="pointer-events-none absolute"
                    style={{
                      left: `${assignment.slot.left}%`,
                      top: `${assignment.slot.top}%`,
                      transform: `translate(-50%, -50%) rotate(${assignment.slot.rotation}deg)`,
                      zIndex: assignment.slot.zIndex + 10,
                    }}
                  >
                    <div
                      className={`overflow-hidden shadow-[0_26px_60px_rgba(0,0,0,0.22)] transition-[opacity,transform,filter] duration-[820ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${getIncomingLayerClasses(showIncoming)}`}
                      style={{
                        width: assignment.slot.width,
                      }}
                    >
                      <div className="overflow-hidden" style={{ aspectRatio }}>
                        <img
                          src={assignment.memory.thumbnailUrl ?? assignment.memory.imageUrl}
                          alt={publicName}
                          width={assignment.memory.imageWidth}
                          height={assignment.memory.imageHeight}
                          loading={index < 6 ? "eager" : "lazy"}
                          decoding="async"
                          className={`block w-full ${
                            hasKnownDimensions
                              ? "h-full object-cover"
                              : "h-auto"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            : null}

          <div className="pointer-events-none absolute left-1/2 top-1/2 z-[40] w-[min(78vw,760px)] -translate-x-1/2 -translate-y-1/2">
            <div className="mx-auto max-w-[720px] rounded-[30px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),rgba(255,255,255,0.02)_58%,rgba(255,255,255,0))] px-4 py-6 text-center shadow-[0_28px_90px_rgba(0,0,0,0.22)] backdrop-blur-[2px] sm:px-8 sm:py-8">
              <p className="text-[clamp(1.55rem,4.8vw,3.9rem)] font-black tracking-[-0.07em] text-white/92 drop-shadow-[0_10px_24px_rgba(6,10,30,0.34)]">
                제 16기
              </p>
              <h1 className="mt-2 text-[clamp(2.4rem,9.6vw,7.2rem)] font-black leading-[0.95] tracking-[-0.09em] text-white drop-shadow-[0_16px_42px_rgba(6,10,30,0.46)]">
                한몽 청년수련회
              </h1>

              <div className="pointer-events-auto mt-5 flex flex-col items-center gap-3 sm:mt-6">
                <button
                  type="button"
                  onClick={handleShuffle}
                  disabled={isLoading || isAnimating || featuredMemories.length < 2}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/24 bg-white/12 px-5 text-sm font-black text-white shadow-[0_16px_36px_rgba(0,0,0,0.18)] backdrop-blur-md transition hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-55 sm:h-13 sm:px-6 sm:text-base"
                >
                  <RiShuffleLine className={isAnimating ? "animate-spin" : ""} />
                  <span>{isAnimating ? "전시 교체 중..." : "셔플"}</span>
                </button>

                {!isLoading && !hasMemories ? (
                  <p className="text-sm font-bold text-white/72 sm:text-base">
                    {emptyMessage}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <MemoryDetailModal
        key={selectedMemory?.id ?? "home-orbit-memory-detail-empty"}
        memory={selectedMemory}
        onClose={() => setSelectedMemory(null)}
        allowMainFeatureToggle={false}
      />
    </>
  );
}
