import Link from "next/link";

const navItems = [
  { href: "/", label: "홈" },
  { href: "/gallery", label: "갤러리" },
  { href: "/upload", label: "업로드" },
  { href: "/manage", label: "관리" },
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-16">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-[#fbf6ee]/80 backdrop-blur-xl">
        <div className="page-wrap flex items-center justify-between gap-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#241a12] text-sm font-bold text-white">
              RM
            </div>
            <div>
              <p className="font-[var(--font-display)] text-lg font-bold">
                리마인드 한몽
              </p>
              <p className="text-xs text-black/55">Media archive starter</p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-2 rounded-full border border-[var(--line)] bg-white/60 p-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm font-medium text-black/70 transition hover:bg-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="page-wrap">{children}</main>
    </div>
  );
}
