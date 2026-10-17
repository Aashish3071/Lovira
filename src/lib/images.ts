"use client";

import { useEffect, useState } from "react";
import type { Bucket } from "./backend/types";

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

// URLs are cached for the session so swiping doesn't re-request them.
const cache = new Map<string, string>();

export async function loadImageUrls(bucket: Bucket, paths: string[]) {
  const { api } = await import("./backend");
  const missing = paths.filter((p) => p && !cache.has(`${bucket}:${p}`));
  if (missing.length) {
    const urls = await api.imageUrls(bucket, missing);
    missing.forEach((p, i) => urls[i] && cache.set(`${bucket}:${p}`, urls[i]));
  }
  return paths.map((p) => cache.get(`${bucket}:${p}`) ?? "");
}

export function useSignedUrls(paths: string[], bucket: Bucket = "photos") {
  const joined = paths.join("|");
  const [, setLoaded] = useState(0);
  useEffect(() => {
    let live = true;
    const list = joined ? joined.split("|") : [];
    loadImageUrls(bucket, list).then(() => live && setLoaded((n) => n + 1));
    return () => {
      live = false;
    };
  }, [joined, bucket]);
  // Read from the cache on every render so each URL always lines up with its path, even mid-reorder.
  return paths.map((p) => cache.get(`${bucket}:${p}`) ?? "");
}
