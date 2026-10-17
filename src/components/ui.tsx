"use client";

import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 font-bold tracking-tight ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="" className="h-8 w-8" />
      <span className="text-xl">Lovira</span>
    </Link>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="Verified with selfie and government ID"
      className={`inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-600 dark:text-sky-400 ${className}`}
    >
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
        <path d="M10 1.5 12.2 3l2.6-.2.9 2.5 2.3 1.3-.6 2.6.6 2.6-2.3 1.3-.9 2.5-2.6-.2L10 17l-2.2-1.5-2.6.2-.9-2.5L2 11.9l.6-2.6L2 6.7l2.3-1.3.9-2.5 2.6.2L10 1.5Zm3.6 6.2-1.1-1.1-3.4 3.5-1.6-1.6-1.1 1.1 2.7 2.7 4.5-4.6Z" />
      </svg>
      Verified
    </span>
  );
}

type Option = { value: string; label: string };

// Pill buttons for picking one (single) or several (multi) options.
export function Chips({
  options,
  value,
  onChange,
  multi = false,
}: {
  options: readonly Option[];
  value: string[];
  onChange: (v: string[]) => void;
  multi?: boolean;
}) {
  const toggle = (v: string) => {
    if (!multi) return onChange([v]);
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          className="chip"
          aria-pressed={value.includes(o.value)}
          onClick={() => toggle(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 pb-2 pt-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      {right}
    </div>
  );
}

export function errorText(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Something went wrong. Please try again.";
}
