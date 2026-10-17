"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMe } from "@/lib/me";
import { Logo } from "./ui";

const TABS = [
  { href: "/discover", label: "Discover", icon: "M12 21s-7.5-4.6-7.5-10.5A4.5 4.5 0 0 1 12 7.6a4.5 4.5 0 0 1 7.5 2.9C19.5 16.4 12 21 12 21Z" },
  { href: "/likes", label: "Likes", icon: "M5 12.5 9.5 17 19 7.5" },
  { href: "/matches", label: "Chats", icon: "M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 4v-4h0A2.5 2.5 0 0 1 4 13.5v-7Z" },
  { href: "/profile", label: "Profile", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useMe();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
        <Logo />
        {status?.plan && status.plan.id !== "free" ? (
          <span className="rounded-full bg-gradient-to-r from-brand to-brand-2 px-3 py-1 text-xs font-semibold text-brand-fg">
            {status.plan.name}
          </span>
        ) : (
          <Link href="/premium" className="rounded-full border border-brand px-3 py-1 text-xs font-semibold text-brand">
            Get a pass
          </Link>
        )}
      </header>
      <main className="flex-1 pb-24">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {TABS.map((t) => {
            const active = pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-xs ${active ? "text-brand" : "text-muted"}`}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={t.icon} />
                </svg>
                {t.label}
                {t.href === "/likes" && !!status?.likes_count && (
                  <span className="absolute right-[28%] top-1.5 min-w-4 rounded-full bg-brand px-1 text-[10px] font-bold leading-4 text-brand-fg">
                    {status.likes_count > 99 ? "99+" : status.likes_count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
