"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/images");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#edf8ff_0%,#d8efff_100%)] px-6 py-10">
      <div className="rounded-[28px] border border-white/70 bg-white/80 px-6 py-5 text-center text-sm font-bold text-slate-700 shadow-[0_18px_46px_rgba(33,110,178,0.14)] backdrop-blur-md">
        관리자 화면으로 이동하고 있어요.
      </div>
    </main>
  );
}
