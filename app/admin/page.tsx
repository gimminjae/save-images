"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { EventSceneBackdrop } from "@/components/event-scene-backdrop";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/images");
  }, [router]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      <EventSceneBackdrop />
      <div className="event-panel relative z-10 rounded-[28px] px-6 py-5 text-center text-sm font-bold text-white shadow-[0_18px_46px_rgba(0,0,0,0.22)] backdrop-blur-md">
        관리자 화면으로 이동하고 있어요.
      </div>
    </main>
  );
}
