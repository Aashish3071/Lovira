"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileView } from "@/components/ProfileView";
import { Spinner } from "@/components/ui";
import { useMe, useRequire } from "@/lib/me";
import { supabase } from "@/lib/supabase/client";
import type { Profile, ProfileCard } from "@/lib/types";

function age(dob: string) {
  const d = new Date(dob);
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
}

export default function ProfilePage() {
  const ok = useRequire("profile");
  const router = useRouter();
  const { user, status } = useMe();
  const [card, setCard] = useState<ProfileCard | null>(null);

  useEffect(() => {
    if (!ok || !user) return;
    const sb = supabase();
    Promise.all([
      sb.from("profiles").select("*").eq("id", user.id).single(),
      sb.from("photos").select("path").eq("user_id", user.id).order("position").order("created_at"),
    ]).then(([{ data: p }, { data: ph }]) => {
      const prof = p as Profile;
      setCard({
        ...prof,
        age: age(prof.dob),
        verified: status?.verification?.status === "approved",
        photos: (ph ?? []).map((x) => x.path),
      });
    });
  }, [ok, user, status?.verification?.status]);

  async function signOut() {
    await supabase().auth.signOut();
    router.replace("/");
  }

  if (!ok || !card || !status) return <Spinner />;

  const verification = status.verification?.status;
  const endsAt = status.plan.ends_at ? new Date(status.plan.ends_at) : null;

  return (
    <div className="space-y-4 px-4 pt-4">
      {verification !== "approved" && (
        <Link href="/verify" className="block rounded-2xl bg-warn/10 p-4 text-sm text-warn">
          {verification === "pending"
            ? "Your verification is under review. You'll appear to others once approved."
            : "Verify your profile to start matching →"}
        </Link>
      )}

      <ProfileView profile={card} />

      <div className="card divide-y divide-line">
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="font-semibold">{status.plan.name} plan</p>
            <p className="text-sm text-muted">
              {status.used_today} of {status.plan.daily_limit} profiles today
              {endsAt && ` · ends ${endsAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`}
            </p>
          </div>
          <Link href="/premium" className="text-sm font-semibold text-brand">
            {status.plan.id === "free" ? "Upgrade" : "Extend"}
          </Link>
        </div>
        <Link href="/profile/edit" className="block p-4 font-medium">Edit profile</Link>
        {status.is_admin && <Link href="/admin" className="block p-4 font-medium text-brand">Admin panel</Link>}
        <Link href="/legal/guidelines" className="block p-4">Community guidelines</Link>
        <Link href="/legal/privacy" className="block p-4">Privacy policy</Link>
        <Link href="/legal/grievance" className="block p-4">Help &amp; grievances</Link>
        <button className="block w-full p-4 text-left text-brand" onClick={signOut}>Sign out</button>
      </div>
    </div>
  );
}
