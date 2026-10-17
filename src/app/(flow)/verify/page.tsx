"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SelfieCamera } from "@/components/SelfieCamera";
import { Spinner, errorText } from "@/components/ui";
import { ID_TYPES } from "@/lib/constants";
import { useMe, useRequire } from "@/lib/me";
import { api, IS_DEMO } from "@/lib/backend";

export default function VerifyPage() {
  const ok = useRequire("profile");
  const router = useRouter();
  const { status, refresh } = useMe();
  const [selfie, setSelfie] = useState<Blob | null>(null);
  const [idType, setIdType] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(false);

  const v = status?.verification;
  const approved = v?.status === "approved" && status?.account_status === "active";
  useEffect(() => {
    if (approved) router.replace("/discover");
  }, [approved, router]);

  if (!ok || !status || approved) return <Spinner />;

  if (status.account_status === "suspended") {
    return (
      <Notice title="Your account is suspended">
        Our team suspended this account after a review. If you think this is a mistake, contact our{" "}
        <Link className="text-brand underline" href="/legal/grievance">grievance officer</Link>.
      </Notice>
    );
  }

  if (v?.status === "pending") {
    return (
      <Notice title="We're checking your details">
        <p>Our team usually reviews new profiles within 24 hours. Your ID photo is deleted as soon as it&apos;s reviewed.</p>
        <p className="mt-3">Until then you can polish your profile. You&apos;ll appear to others once you&apos;re verified.</p>
        <div className="mt-6 grid gap-2">
          <button className="btn-primary" onClick={() => refresh()}>Check again</button>
          <Link href="/profile/edit" className="btn-ghost">Edit profile</Link>
          {IS_DEMO && <Link href="/admin" className="btn-ghost text-brand">Review it in the admin panel</Link>}
        </div>
        {status.is_admin && <div className="mt-6 text-left"><AdminBypass onDone={refresh} /></div>}
      </Notice>
    );
  }

  const showForm = !v || retry;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selfie || !idType || !idFile || !consent) return setError("Please complete every step above.");
    setBusy(true);
    setError("");
    try {
      await api.submitVerification(idType, selfie, idFile);
      setRetry(false);
      await refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  if (!showForm) {
    return (
      <Notice title="We couldn't verify you">
        {v?.reject_reason && <p className="error mb-4">{v.reject_reason}</p>}
        <p>Please try again with a clear selfie and a readable photo of your ID.</p>
        <button className="btn-primary mt-6 w-full" onClick={() => setRetry(true)}>Try again</button>
      </Notice>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-6 px-4 pb-16 pt-4">
      <div>
        <h1 className="text-3xl font-bold">Get verified</h1>
        <p className="mt-2 text-muted">
          Lovira only shows verified people. It takes a minute, and you only do it once.
        </p>
      </div>

      {status.is_admin && !IS_DEMO && <AdminBypass onDone={refresh} />}

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold">1. Take a live selfie</h2>
        <SelfieCamera onCapture={setSelfie} />
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold">2. Photo of one government ID</h2>
        <select className="input" value={idType} onChange={(e) => setIdType(e.target.value)} aria-label="ID type">
          <option value="">Choose ID type</option>
          {ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {idType === "masked_aadhaar" && (
          <p className="text-xs text-muted">
            Download a masked Aadhaar from the UIDAI or DigiLocker app. Never upload a full Aadhaar number.
          </p>
        )}
        <label className="btn-ghost w-full cursor-pointer">
          {idFile ? `✓ ${idFile.name}` : "Upload ID photo"}
          <input type="file" accept="image/*" hidden onChange={(e) => setIdFile(e.target.files?.[0] ?? null)} />
        </label>
        <p className="text-xs text-muted">Your name and photo must be readable. You can cover the ID number.</p>
      </section>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--brand)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          I consent to Lovira using my selfie and ID only to confirm my identity and age. The ID photo is deleted
          after review. See our <Link className="underline" href="/legal/privacy">Privacy Policy</Link>.
        </span>
      </label>

      {error && <p className="error">{error}</p>}
      <button className="btn-primary w-full" disabled={busy || !selfie || !idType || !idFile || !consent}>
        {busy ? "Uploading…" : "Submit for review"}
      </button>
      {IS_DEMO && <AdminBypass onDone={refresh} />}
    </form>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 pt-16 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-3xl">🛡️</div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="mt-3 text-muted">{children}</div>
    </div>
  );
}

// Admins (the founder) can skip verification to test the app.
function AdminBypass({ onDone }: { onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function go() {
    setBusy(true);
    try {
      await api.adminSelfVerify();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
      return;
    }
    await onDone();
  }
  return (
    <div className="rounded-2xl border border-dashed border-brand p-4">
      <p className="text-sm font-semibold text-brand">Admin shortcut</p>
      <p className="mt-1 text-sm text-muted">You&apos;re an admin, so you can skip the selfie and ID check for testing.</p>
      {error && <p className="error mt-2">{error}</p>}
      <button type="button" className="btn-primary mt-3 w-full" disabled={busy} onClick={go}>
        {busy ? "Verifying…" : "Verify me (admin)"}
      </button>
    </div>
  );
}
