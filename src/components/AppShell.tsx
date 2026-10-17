"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IS_DEMO } from "@/lib/backend";
import { useMe } from "@/lib/me";
import { Logo } from "./ui";

// Outline icons; the selected tab fills its shape and sits on a tinted pill.
const TABS: { href: string; label: string; icon: React.ReactNode }[] = [
  {
    href: "/discover",
    label: "Discover",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
      </>
    ),
  },
  {
    href: "/likes",
    label: "Likes",
    icon: <path d="M12 20s-7.5-4.6-7.5-10.3A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.7C19.5 15.4 12 20 12 20Z" />,
  },
  {
    href: "/matches",
    label: "Chats",
    icon: <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 4v-4A2.5 2.5 0 0 1 4 13.5v-7Z" />,
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 20a7 7 0 0 1 14 0Z" />
      </>
    ),
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useMe();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      {IS_DEMO && <DemoStrip />}
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
            const badge = t.href === "/likes" ? status?.likes_count ?? 0 : 0;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] transition-colors ${
                  active ? "font-semibold text-brand" : "font-medium text-muted hover:text-fg"
                }`}
              >
                <span className={`relative flex h-8 w-14 items-center justify-center rounded-full transition-colors ${active ? "bg-brand/15" : ""}`}>
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill={active ? "currentColor" : "none"}
                    fillOpacity={active ? 0.25 : 0}
                    stroke="currentColor"
                    strokeWidth={active ? 2.2 : 1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    {t.icon}
                  </svg>
                  {badge > 0 && (
                    <span className="absolute -right-0.5 -top-1 min-w-[18px] rounded-full border-2 border-card bg-brand px-1 text-center text-[10px] font-bold leading-[14px] text-brand-fg">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </span>
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function DemoStrip() {
  return (
    <div className="bg-fg px-4 py-1.5 text-center text-xs text-bg">
      Demo preview · sample profiles · no real payments
    </div>
  );
}
