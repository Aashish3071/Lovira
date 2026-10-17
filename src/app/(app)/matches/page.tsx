"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { PageHeader, Spinner } from "@/components/ui";
import { useMe, useRequire } from "@/lib/me";
import { supabase } from "@/lib/supabase/client";
import type { MatchSummary } from "@/lib/types";

export default function MatchesPage() {
  const ok = useRequire("verified");
  const { user } = useMe();
  const [matches, setMatches] = useState<MatchSummary[] | null>(null);

  useEffect(() => {
    if (!ok) return;
    const load = () => supabase().rpc("my_matches").then(({ data }) => setMatches(data ?? []));
    load();
    // New messages in any of my chats bump that chat to the top.
    const channel = supabase()
      .channel("matches-list")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, load)
      .subscribe();
    return () => {
      supabase().removeChannel(channel);
    };
  }, [ok]);

  if (!ok || !matches) return <Spinner />;

  const fresh = matches.filter((m) => !m.last_message);
  const chats = matches.filter((m) => m.last_message);

  return (
    <div>
      <PageHeader title="Chats" />
      {matches.length === 0 && (
        <p className="px-6 py-20 text-center text-muted">
          No matches yet. When you and someone both like each other, you can chat here.
        </p>
      )}
      {fresh.length > 0 && (
        <section className="px-4 pb-4">
          <h2 className="mb-2 text-sm font-semibold text-muted">New matches</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {fresh.map((m) => (
              <Link key={m.match_id} href={`/chat/${m.match_id}`} className="flex w-16 flex-col items-center gap-1">
                <Avatar path={m.profile.photos[0]} name={m.profile.name} size={64} />
                <span className="w-full truncate text-center text-xs">{m.profile.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <div className="divide-y divide-line">
        {chats.map((m) => (
          <Link key={m.match_id} href={`/chat/${m.match_id}`} className="flex items-center gap-3 px-4 py-3">
            <Avatar path={m.profile.photos[0]} name={m.profile.name} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{m.profile.name}</p>
              <p className="truncate text-sm text-muted">
                {m.last_sender === user?.id ? "You: " : ""}
                {m.last_message}
              </p>
            </div>
            <span className="text-xs text-muted">
              {new Date(m.last_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
