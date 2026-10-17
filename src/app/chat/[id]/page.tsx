"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { ProfileView } from "@/components/ProfileView";
import { ReportDialog } from "@/components/ReportDialog";
import { Spinner, VerifiedBadge, errorText } from "@/components/ui";
import { useMe, useRequire } from "@/lib/me";
import { supabase } from "@/lib/supabase/client";
import type { Message, ProfileCard } from "@/lib/types";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const ok = useRequire("verified");
  const router = useRouter();
  const { user } = useMe();
  const [other, setOther] = useState<ProfileCard | null | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [reporting, setReporting] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ok) return;
    const sb = supabase();
    sb.rpc("match_detail", { p_match_id: id }).then(({ data }) => setOther(data?.profile ?? null));
    sb.from("messages")
      .select("*")
      .eq("match_id", id)
      .order("created_at")
      .limit(500)
      .then(({ data }) => setMessages(data ?? []));

    const channel = sb
      .channel(`chat-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${id}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [ok, id]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    setError("");
    const { data, error } = await supabase()
      .from("messages")
      .insert({ match_id: id, sender: user!.id, body })
      .select()
      .single();
    if (error) {
      setText(body);
      return setError(errorText(error));
    }
    setMessages((list) => (list.some((x) => x.id === data.id) ? list : [...list, data]));
  }

  async function unmatch() {
    if (!confirm(`Unmatch ${other?.name}? This deletes the chat for both of you.`)) return;
    await supabase().rpc("unmatch", { p_match_id: id });
    router.replace("/matches");
  }

  if (!ok || other === undefined) return <Spinner />;
  if (other === null) {
    return (
      <div className="p-8 text-center text-muted">
        This chat is no longer available. <Link className="text-brand underline" href="/matches">Back to chats</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col">
      <header className="flex items-center gap-3 border-b border-line px-3 py-2">
        <Link href="/matches" className="px-2 text-2xl text-muted" aria-label="Back">‹</Link>
        <button className="flex flex-1 items-center gap-3 text-left" onClick={() => setShowProfile(true)}>
          <Avatar path={other.photos[0]} name={other.name} size={40} />
          <div>
            <p className="font-semibold leading-tight">{other.name}</p>
            {other.verified && <VerifiedBadge />}
          </div>
        </button>
        <div className="relative">
          <button className="px-3 text-2xl text-muted" aria-label="More" onClick={() => setMenu(!menu)}>⋯</button>
          {menu && (
            <div className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-xl border border-line bg-card shadow-lg">
              <button className="block w-full px-4 py-3 text-left" onClick={() => { setMenu(false); setShowProfile(true); }}>View profile</button>
              <button className="block w-full px-4 py-3 text-left" onClick={() => { setMenu(false); unmatch(); }}>Unmatch</button>
              <button className="block w-full px-4 py-3 text-left text-brand" onClick={() => { setMenu(false); setReporting(true); }}>Report or block</button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {messages.length === 0 && (
          <p className="py-12 text-center text-sm text-muted">
            You matched with {other.name}. Say hi! 👋
            <br />
            Never send money or share OTPs with someone you met online.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 ${
                  mine ? "rounded-br-md bg-brand text-brand-fg" : "rounded-bl-md bg-soft"
                }`}
              >
                {m.body}
                <span className={`ml-2 align-bottom text-[10px] ${mine ? "text-brand-fg/70" : "text-muted"}`}>
                  {new Date(m.created_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {error && <p className="error mx-3 mb-2">{error}</p>}
      <form onSubmit={send} className="flex gap-2 border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <input
          className="input flex-1 !rounded-full"
          placeholder="Message"
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn-primary !px-4" disabled={!text.trim()} aria-label="Send">Send</button>
      </form>

      {showProfile && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-bg">
          <div className="mx-auto max-w-md px-4 pb-10 pt-4">
            <button className="mb-3 text-sm text-muted" onClick={() => setShowProfile(false)}>← Back to chat</button>
            <ProfileView profile={other} />
          </div>
        </div>
      )}
      {reporting && (
        <ReportDialog
          targetId={other.id}
          name={other.name}
          onClose={() => setReporting(false)}
          onBlocked={() => router.replace("/matches")}
        />
      )}
    </div>
  );
}
