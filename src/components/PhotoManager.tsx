"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_PHOTOS, MIN_PHOTOS } from "@/lib/constants";
import { uploadImage, useSignedUrls } from "@/lib/images";
import { supabase } from "@/lib/supabase/client";
import { errorText } from "./ui";

type Photo = { id: string; path: string; position: number };

export function PhotoManager({ userId, onCountChange }: { userId: string; onCountChange?: (n: number) => void }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const urls = useSignedUrls(photos.map((p) => p.path));

  const load = useCallback(async () => {
    const { data } = await supabase()
      .from("photos")
      .select("id, path, position")
      .eq("user_id", userId)
      .order("position")
      .order("created_at");
    setPhotos(data ?? []);
    onCountChange?.(data?.length ?? 0);
  }, [userId, onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      const room = MAX_PHOTOS - photos.length;
      let pos = photos.length;
      for (const file of Array.from(files).slice(0, room)) {
        const path = await uploadImage("photos", userId, file);
        const { error } = await supabase().from("photos").insert({ user_id: userId, path, position: pos++ });
        if (error) throw error;
      }
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(p: Photo) {
    setBusy(true);
    const sb = supabase();
    await sb.storage.from("photos").remove([p.path]);
    await sb.from("photos").delete().eq("id", p.id);
    await load();
    setBusy(false);
  }

  async function makeMain(p: Photo) {
    setBusy(true);
    const ordered = [p, ...photos.filter((x) => x.id !== p.id)];
    const sb = supabase();
    await Promise.all(ordered.map((x, i) => sb.from("photos").update({ position: i }).eq("id", x.id)));
    await load();
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p, i) => (
          <div key={p.id} className="relative aspect-[3/4] overflow-hidden rounded-xl bg-soft">
            {urls[i] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urls[i]} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
            )}
            {i === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">Main</span>
            )}
            <div className="absolute inset-x-1.5 bottom-1.5 flex gap-1">
              {i > 0 && (
                <button className="flex-1 rounded-full bg-black/60 py-1 text-[10px] font-semibold text-white" disabled={busy} onClick={() => makeMain(p)}>
                  Make main
                </button>
              )}
              <button
                aria-label="Delete photo"
                className="ml-auto h-6 w-6 rounded-full bg-black/60 text-sm leading-6 text-white"
                disabled={busy}
                onClick={() => remove(p)}
              >
                ×
              </button>
            </div>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            className="flex aspect-[3/4] flex-col items-center justify-center rounded-xl border-2 border-dashed border-line text-muted"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <span className="text-3xl leading-none">+</span>
            <span className="mt-1 text-xs">{busy ? "Uploading…" : "Add photo"}</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
      <p className="text-sm text-muted">
        Add {MIN_PHOTOS}–{MAX_PHOTOS} clear photos of yourself. Your face should match your verification selfie.
      </p>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
