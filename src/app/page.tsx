"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui";
import { useMe } from "@/lib/me";

const FEATURES = [
  {
    title: "Only verified people",
    body: "Everyone does a live selfie and a government ID check before they can like or chat. No bots, no catfish.",
  },
  {
    title: "Made for everyone",
    body: "Pick your gender and orientation from the full range, and choose exactly who you want to see.",
  },
  {
    title: "150 profiles a day, free",
    body: "More than enough to find your people, and same-city profiles come first.",
  },
  {
    title: "Pay for a day, not a month",
    body: "Need more? A Day Pass is just ₹29. Weekly and monthly passes too, all with UPI.",
  },
];

export default function Landing() {
  const { user, loading } = useMe();
  const router = useRouter();
  useEffect(() => {
    if (!loading && user) router.replace("/discover");
  }, [loading, user, router]);

  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-4">
      <header className="flex items-center justify-between py-4">
        <Logo />
        <Link href="/login" className="btn-ghost !py-2">Sign in</Link>
      </header>

      <section className="py-14 text-center sm:py-24">
        <p className="mx-auto mb-4 w-fit rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand">
          Every profile is ID-verified
        </p>
        <h1 className="mx-auto max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Real people. <span className="bg-gradient-to-r from-brand to-brand-2 bg-clip-text text-transparent">Real connections.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          Lovira is dating for everyone in India, where every single profile is verified and premium starts at ₹29 a day.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/login" className="btn-primary px-8 py-4 text-base">Create your profile</Link>
        </div>
        <p className="mt-3 text-xs text-muted">18+ only · Free to join</p>
      </section>

      <section className="grid gap-4 pb-16 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="card p-6">
            <h2 className="text-lg font-semibold">{f.title}</h2>
            <p className="mt-2 text-muted">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-line py-8 text-sm text-muted">
        <Link href="/legal/privacy">Privacy</Link>
        <Link href="/legal/terms">Terms</Link>
        <Link href="/legal/guidelines">Community guidelines</Link>
        <Link href="/legal/grievance">Grievance officer</Link>
        <span>© {new Date().getFullYear()} Lovira</span>
      </footer>
    </div>
  );
}
