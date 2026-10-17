"use client";

import { useSignedUrls } from "@/lib/images";

export function Avatar({ path, name, size = 56 }: { path?: string; name: string; size?: number }) {
  const [url] = useSignedUrls(path ? [path] : []);
  return (
    <div className="shrink-0 overflow-hidden rounded-full bg-soft" style={{ width: size, height: size }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center font-semibold text-muted">{name[0]}</div>
      )}
    </div>
  );
}
