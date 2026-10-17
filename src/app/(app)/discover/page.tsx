"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProfileView } from "@/components/ProfileView";
import { ReportDialog } from "@/components/ReportDialog";
import { Spinner, errorText } from "@/components/ui";
import { api, type Feed } from "@/lib/backend";
import { loadImageUrls } from "@/lib/images";
import { useMe, useRequire } from "@/lib/me";
import type { ProfileCard } from "@/lib/types";

export default function DiscoverPage() {
  const ok = useRequire("verified");
  const { status, refresh } = useMe();
  const [deck, setDeck] = useState<ProfileCard[] | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [match, setMatch] = useState<{ id: string; profile: ProfileCard } | null>(null);
  const [reporting, setReporting] = useState(false);
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);

  const load = useCallback(async () => {
    let feed: Feed;
    try {
      feed = await api.getFeed(10);
    } catch (e) {
      return setError(errorText(e));
    }
    // Append rather than replace so the card on screen never jumps.
    setDeck((d) => {
      const seen = new Set(d?.map((p) => p.id));
      return [...(d ?? []), ...feed.profiles.filter((p) => !seen.has(p.id))];
    });
    setRemaining(feed.remaining);
    // Warm the photo cache so the next cards appear instantly.
    loadImageUrls("photos", feed.profiles.flatMap((p) => p.photos));
  }, []);

  useEffect(() => {
    if (ok) load();
  }, [ok, load]);

  const current = deck?.[0];

  async function swipe(liked: boolean) {
    if (!current || busy) return;
    setBusy(true);
    setDrag(0);
    let data;
    try {
      data = await api.swipe(current.id, liked);
    } catch (e) {
      if (/Daily limit/.test(errorText(e))) setRemaining(0);
      else setError(errorText(e));
      return;
    } finally {
      setBusy(false);
    }
    if (data.matched && data.match_id) setMatch({ id: data.match_id, profile: current });
    setRemaining((r) => r - 1);
    const rest = deck!.slice(1);
    setDeck(rest);
    window.scrollTo({ top: 0 });
    if (rest.length < 3) load();
    refresh();
  }

  const removeCurrent = () => {
    setReporting(false);
    setDeck((d) => d?.slice(1) ?? null);
  };

  if (!ok || !deck || !status) return <Spinner label="Finding people near you…" />;

  if (remaining <= 0) {
    return (
      <Empty title="That's all for today">
        You&apos;ve seen {status.plan.daily_limit} profiles today. Come back tomorrow, or get a pass to see more right now.
        <Link href="/premium" className="btn-primary mt-6 w-full">See more today, from ₹29</Link>
      </Empty>
    );
  }

  if (!current) {
    return (
      <Empty title="You're all caught up">
        No new verified profiles match your filters right now. New people join every day. Try widening your age range
        or who you&apos;d like to see.
        <Link href="/profile/edit" className="btn-ghost mt-6 w-full">Edit preferences</Link>
      </Empty>
    );
  }

  return (
    <div className="px-4 pt-3">
      <p className="mb-2 text-center text-xs text-muted">{remaining} profiles left today</p>
      {error && <p className="error mb-3">{error}</p>}
      <div
        key={current.id}
        style={{ transform: `translateX(${drag}px) rotate(${drag / 25}deg)`, transition: start.current === null ? "transform .2s" : "none" }}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse") start.current = e.clientX;
        }}
        onPointerMove={(e) => start.current !== null && setDrag(e.clientX - start.current)}
        onPointerUp={() => {
          start.current = null;
          if (drag > 110) swipe(true);
          else if (drag < -110) swipe(false);
          else setDrag(0);
        }}
        onPointerCancel={() => {
          start.current = null;
          setDrag(0);
        }}
        className="relative touch-pan-y"
      >
        {drag !== 0 && (
          <div className={`pointer-events-none absolute left-1/2 top-24 z-10 -translate-x-1/2 rounded-xl border-4 px-4 py-1 text-3xl font-black ${drag > 0 ? "border-ok text-ok" : "border-brand text-brand"}`} style={{ opacity: Math.min(Math.abs(drag) / 110, 1) }}>
            {drag > 0 ? "LIKE" : "NOPE"}
          </div>
        )}
        <ProfileView profile={current} />
      </div>

      <button className="mt-6 w-full text-center text-sm text-muted underline" onClick={() => setReporting(true)}>
        Report or block {current.name}
      </button>

      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-20 flex justify-center gap-6 pb-[env(safe-area-inset-bottom)]">
        <button
          aria-label="Pass"
          disabled={busy}
          onClick={() => swipe(false)}
          className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border border-line bg-card text-3xl text-muted shadow-lg active:scale-95"
        >
          ✕
        </button>
        <button
          aria-label="Like"
          disabled={busy}
          onClick={() => swipe(true)}
          className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-2 text-3xl text-brand-fg shadow-lg active:scale-95"
        >
          ♥
        </button>
      </div>
      <div className="h-24" />

      {reporting && (
        <ReportDialog targetId={current.id} name={current.name} onClose={() => setReporting(false)} onBlocked={removeCurrent} />
      )}
      {match && <MatchModal match={match} onClose={() => setMatch(null)} />}
    </div>
  );
}

function MatchModal({ match, onClose }: { match: { id: string; profile: ProfileCard }; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-brand to-brand-2 p-6 text-center text-white">
      <div className="w-full max-w-sm">
        <p className="text-5xl">💞</p>
        <h2 className="mt-4 text-4xl font-black">It&apos;s a match!</h2>
        <p className="mt-2 opacity-90">You and {match.profile.name} liked each other.</p>
        <Link href={`/chat/${match.id}`} className="btn mt-8 w-full bg-white text-brand">Say hello</Link>
        <button className="btn mt-2 w-full text-white" onClick={onClose}>Keep browsing</button>
      </div>
    </div>
  );
}

function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-sm px-6 pt-20 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="mt-3 flex flex-col text-muted">{children}</div>
    </div>
  );
}
