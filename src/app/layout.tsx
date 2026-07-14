import type { Metadata } from "next";
import { Noto_Sans_KR, Space_Grotesk } from "next/font/google";

import "@/app/globals.css";
import { SiteShell } from "@/components/site-shell";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Noto_Sans_KR({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "리마인드 한몽",
  description:
    "제16기 한몽 청년수련회 사진과 영상을 모아 공유하는 미디어 아카이브 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${display.variable} ${body.variable}`}>
      <body className="font-[var(--font-body)] antialiased">
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
