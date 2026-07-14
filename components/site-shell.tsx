import Link from "next/link";

import { EventSceneBackdrop } from "@/components/event-scene-backdrop";
import { FloatingUploadButton } from "@/components/floating-upload-button";

const navItems = [
  { href: "/", label: "메인" },
  { href: "/gallery", label: "모든 이미지" },
  { href: "/upload", label: "업로드" },
  { href: "/category", label: "카테고리" },
  { href: "/images", label: "이미지 관리" },
];

type SiteShellProps = {
  children: React.ReactNode;
  currentPath: string;
  showHeader?: boolean;
  showBackdrop?: boolean;
  fullBleed?: boolean;
  mainClassName?: string;
  contentClassName?: string;
};

function isActive(currentPath: string, href: string) {
  if (href === "/") {
    return currentPath === "/";
  }

  return currentPath.startsWith(href);
}

export function SiteShell({
  children,
  currentPath,
  showHeader = true,
  showBackdrop = true,
  fullBleed = false,
  mainClassName = "",
  contentClassName = "",
}: SiteShellProps) {
  return (
    <main
      className={`relative min-h-screen overflow-hidden ${
        fullBleed ? "" : "px-4 py-4 sm:px-6 sm:py-6"
      } ${mainClassName}`}
    >
      {showBackdrop ? <EventSceneBackdrop /> : null}
      <div
        className={`mx-auto flex w-full flex-col ${
          fullBleed ? "max-w-none gap-0" : "max-w-7xl gap-5"
        } ${contentClassName}`}
      >
        {showHeader ? (
          <header className="event-panel rounded-[30px] px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <Link
                href="/"
                className="text-2xl font-black tracking-[-0.06em] text-slate-950"
              >
                Hanmong Archive
              </Link>
              <nav className="flex gap-2 overflow-x-auto pb-1">
                {navItems.map((item) => {
                  const active = isActive(currentPath, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-black transition ${
                        active
                          ? "bg-sky-500 text-white shadow-[0_12px_24px_rgba(33,110,178,0.16)]"
                          : "bg-white/85 text-slate-700"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </header>
        ) : null}

        {children}
      </div>
      <FloatingUploadButton hidden={currentPath.startsWith("/upload")} />
    </main>
  );
}
