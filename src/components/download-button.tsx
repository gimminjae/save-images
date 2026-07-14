"use client";

import { useState } from "react";

export function DownloadButton({ mediaId }: { mediaId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/downloads/presign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mediaId }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "다운로드 링크를 만들지 못했습니다.");
      }

      window.location.href = payload.url;
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "다운로드 링크를 만들지 못했습니다.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleDownload}
        disabled={pending}
        className="rounded-full bg-[var(--accent)] px-5 py-3 font-medium text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "링크 생성 중..." : "원본 다운로드"}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
