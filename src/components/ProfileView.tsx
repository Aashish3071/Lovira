"use client";

import { useState } from "react";
import { genderLabel, labelOf, ORIENTATIONS } from "@/lib/constants";
import { useSignedUrls } from "@/lib/images";
import type { ProfileCard } from "@/lib/types";
import { VerifiedBadge } from "./ui";

// Full profile: photo carousel (tap left/right), details, bio and prompts.
export function ProfileView({ profile, compact = false }: { profile: ProfileCard; compact?: boolean }) {
  const urls = useSignedUrls(profile.photos);
  const [i, setI] = useState(0);
  const n = profile.photos.length;

  return (
    <div>
      <div className={`relative overflow-hidden rounded-2xl bg-soft ${compact ? "aspect-[4/5]" : "aspect-[3/4]"}`}>
        {urls[i] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urls[i]} alt={`${profile.name}, photo ${i + 1}`} className="h-full w-full object-cover" />
        )}
        {n > 1 && !compact && (
          <>
            <div className="absolute inset-x-3 top-3 flex gap-1">
              {profile.photos.map((_, k) => (
                <div key={k} className={`h-1 flex-1 rounded-full ${k === i ? "bg-white" : "bg-white/40"}`} />
              ))}
            </div>
            <button aria-label="Previous photo" className="absolute inset-y-0 left-0 w-1/3" onClick={() => setI((i - 1 + n) % n)} />
            <button aria-label="Next photo" className="absolute inset-y-0 right-0 w-1/3" onClick={() => setI((i + 1) % n)} />
          </>
        )}
        <div className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent text-white ${compact ? "p-3 pt-10" : "p-4 pt-16"}`}>
          <div className={`flex gap-x-2 gap-y-1 ${compact ? "flex-col items-start" : "flex-wrap items-center"}`}>
            <h2 className={`font-bold ${compact ? "text-lg leading-tight" : "text-2xl"}`}>
              {profile.name}, {profile.age}
            </h2>
            {profile.verified && <VerifiedBadge className="!bg-white/90 !text-sky-600" />}
          </div>
          <p className={`opacity-90 ${compact ? "text-xs" : "text-sm"}`}>
            {profile.city}, {profile.state}
          </p>
        </div>
      </div>

      {!compact && (
        <div className="space-y-3 pt-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-soft px-3 py-1">{genderLabel(profile.gender, profile.gender_custom)}</span>
            {profile.orientations.map((o) => (
              <span key={o} className="rounded-full bg-soft px-3 py-1">
                {labelOf(ORIENTATIONS, o)}
              </span>
            ))}
          </div>
          {profile.bio && <p className="whitespace-pre-line leading-relaxed">{profile.bio}</p>}
          {profile.prompts?.map((p) => (
            <div key={p.q} className="card p-4">
              <p className="text-sm text-muted">{p.q}</p>
              <p className="mt-1 text-lg font-medium">{p.a}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
