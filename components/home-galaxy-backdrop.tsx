"use client";

import { memo } from "react";
import Galaxy from "@/components/galaxy";

export const HomeGalaxyBackdrop = memo(function HomeGalaxyBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 bg-[#02030a] [contain:strict]">
      <Galaxy
        className="absolute inset-0 [transform:translateZ(0)]"
        mouseRepulsion={false}
        mouseInteraction={false}
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
  );
});
