"use client";

import { useEffect, useRef, useState } from "react";

// Live front-camera capture. Falls back to the phone's camera picker if live video isn't available.
export function SelfieCamera({ onCapture }: { onCapture: (blob: Blob) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [failed, setFailed] = useState(false);
  const [preview, setPreview] = useState("");

  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);

  async function start() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      setStream(s);
      setPreview("");
      requestAnimationFrame(() => {
        if (video.current) video.current.srcObject = s;
      });
    } catch {
      setFailed(true);
    }
  }

  function snap() {
    const v = video.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d")!;
    ctx.translate(c.width, 0); // un-mirror so the saved photo matches reality
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0);
    c.toBlob((b) => {
      if (!b) return;
      setPreview(URL.createObjectURL(b));
      onCapture(b);
      stream?.getTracks().forEach((t) => t.stop());
      setStream(null);
    }, "image/jpeg", 0.9);
  }

  function picked(file?: File) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onCapture(file);
  }

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-[3/4] w-48 overflow-hidden rounded-2xl bg-soft">
        {stream ? (
          <video ref={video} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
        ) : preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Your selfie" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted">
            Face the camera in good light. No sunglasses or masks.
          </div>
        )}
      </div>
      <div className="flex justify-center gap-2">
        {stream ? (
          <button type="button" className="btn-primary" onClick={snap}>Take selfie</button>
        ) : failed ? (
          <label className="btn-ghost cursor-pointer">
            {preview ? "Retake" : "Open camera"}
            <input type="file" accept="image/*" capture="user" hidden onChange={(e) => picked(e.target.files?.[0])} />
          </label>
        ) : (
          <button type="button" className="btn-ghost" onClick={start}>{preview ? "Retake" : "Start camera"}</button>
        )}
      </div>
    </div>
  );
}
