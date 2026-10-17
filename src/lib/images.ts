"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase/client";

// Shrinks a photo to at most `max` px on the long side and re-encodes it as JPEG.
// Keeps uploads small on mobile data and strips location metadata.
export async function resizeImage(file: Blob, max = 1280, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process image"))), "image/jpeg", quality),
  );
}

export async function uploadImage(bucket: "photos" | "verification", userId: string, file: Blob) {
  const blob = await resizeImage(file);
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase().storage.from(bucket).upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  return path;
}

// Signed URLs are cached for the session so swiping doesn't re-request them.
const cache = new Map<string, string>();

export async function signedUrls(bucket: "photos" | "verification", paths: string[]) {
  const key = (p: string) => `${bucket}:${p}`;
  const missing = paths.filter((p) => !cache.has(key(p)));
  if (missing.length) {
    const { data } = await supabase().storage.from(bucket).createSignedUrls(missing, 60 * 60);
    data?.forEach((d) => d.signedUrl && d.path && cache.set(key(d.path), d.signedUrl));
  }
  return paths.map((p) => cache.get(key(p)) ?? "");
}

export function useSignedUrls(paths: string[], bucket: "photos" | "verification" = "photos") {
  const joined = paths.join("|");
  const [, setLoaded] = useState(0);
  useEffect(() => {
    let live = true;
    const list = joined ? joined.split("|") : [];
    signedUrls(bucket, list).then(() => live && setLoaded((n) => n + 1));
    return () => {
      live = false;
    };
  }, [joined, bucket]);
  // Read from the cache on every render so each URL always lines up with its path, even mid-reorder.
  return paths.map((p) => cache.get(`${bucket}:${p}`) ?? "");
}
