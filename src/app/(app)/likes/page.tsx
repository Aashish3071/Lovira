"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileView } from "@/components/ProfileView";
import { PageHeader, Spinner, errorText } from "@/components/ui";
import { useMe, useRequire } from "@/lib/me";
import { supabase } from "@/lib/supabase/client";
import type { ProfileCard } from "@/lib/types";

type Likes = { count: number; can_see: boolean; profiles: ProfileCard[] };

export default function LikesPage() {
  const ok = useRequire("verified");
  const router = useRouter();
  const { refresh } = useMe();
  const [likes, setLikes] = useState<Likes | null>(null);
  const [open, setOpen] = useState<ProfileCard | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase().rpc("likes_received");
    setLikes(data as Likes);
  }, []);

  useEffect(() => {
    if (ok) load();
  }, [ok, load]);

  async function answer(p: ProfileCard, liked: boolean) {
    setError("");
    const { data, error } = await supabase().rpc("swipe", { target: p.id, p_liked: liked });
    if (error) return setError(/Daily limit/.test(error.message) ? "You've reached today's limit." : errorText(error));
    setOpen(null);
    refresh();
    if (data?.matched) router.push(`/chat/${data.match_id}`);
    else load();
  }

  if (!ok || !likes) return <Spinner />;

  return (
    <div>
      <PageHeader title="Likes" />
      {likes.count === 0 ? (
        <p className="px-6 py-20 text-center text-muted">No new likes yet. Keep exploring. They&apos;ll show up here.</p>
      ) : !likes.can_see ? (
        <div className="px-4">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: Math.min(likes.count, 6) }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-brand/30 to-brand-2/30 blur-[2px]" />
            ))}
          </div>
          <div className="card mt-4 p-5 text-center">
            <p className="text-lg font-semibold">
              {likes.count} {likes.count === 1 ? "person likes" : "people like"} you
            </p>
            <p className="mt-1 text-sm text-muted">
              Get any pass to see who, or keep swiping in Discover. If you like them too, it&apos;s a match.
            </p>
            <Link href="/premium" className="btn-primary mt-4 w-full">See who likes you, from ₹29</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4">
          {likes.profiles.map((p) => (
            <button key={p.id} className="text-left" onClick={() => setOpen(p)}>
              <ProfileView profile={p} compact />
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-bg">
          <div className="mx-auto max-w-md px-4 pb-32 pt-4">
            <button className="mb-3 text-sm text-muted" onClick={() => setOpen(null)}>← Back</button>
            <ProfileView profile={open} />
            {error && <p className="error mt-3">{error}</p>}
          </div>
          <div className="fixed inset-x-0 bottom-0 border-t border-line bg-bg/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto flex max-w-md gap-3">
              <button className="btn-ghost flex-1" onClick={() => answer(open, false)}>Pass</button>
              <button className="btn-primary flex-1" onClick={() => answer(open, true)}>Like back ♥</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
