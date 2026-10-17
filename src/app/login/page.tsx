"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo, errorText } from "@/components/ui";
import { useMe } from "@/lib/me";
import { api, IS_DEMO } from "@/lib/backend";
import { demoTools } from "@/lib/backend/demo";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading, refresh } = useMe();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get("error") ? "That sign-in link expired. Please request a new one." : "");

  useEffect(() => {
    if (!loading && user) router.replace("/discover");
  }, [loading, user, router]);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.sendCode(email.trim());
      setSent(true);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.verifyCode(email.trim(), code.trim());
    } catch {
      setBusy(false);
      return setError("That code didn't work. Check it, or request a new one.");
    }
    await refresh();
    router.replace("/discover");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col px-4">
      <header className="py-4">
        <Logo />
      </header>
      <div className="flex flex-1 flex-col justify-center pb-24">
        {!sent ? (
          <form onSubmit={sendCode} className="space-y-4">
            <h1 className="text-3xl font-bold">Sign in or join</h1>
            <p className="text-muted">We&apos;ll email you a 6-digit code. No password needed.</p>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && <p className="error">{error}</p>}
            <button className="btn-primary w-full" disabled={busy}>{busy ? "Sending…" : "Send code"}</button>
            {IS_DEMO && (
              <div className="rounded-2xl border border-dashed border-brand p-4 text-sm">
                <p className="font-semibold text-brand">Demo preview</p>
                <p className="mt-1 text-muted">
                  Sign up with any email to walk through the full flow, or jump straight in with a ready-made, verified profile.
                </p>
                <button
                  type="button"
                  className="btn-ghost mt-3 w-full"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    await demoTools.useSampleAccount();
                    await refresh();
                    router.replace("/discover");
                  }}
                >
                  Use sample account
                </button>
              </div>
            )}
            <p className="text-center text-xs text-muted">
              By continuing you confirm you are 18 or older and agree to our{" "}
              <Link className="underline" href="/legal/terms">Terms</Link> and{" "}
              <Link className="underline" href="/legal/privacy">Privacy Policy</Link>.
            </p>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <h1 className="text-3xl font-bold">Check your email</h1>
            <p className="text-muted">
              We sent a code to <strong className="text-fg">{email}</strong>. Enter it below, or tap the link in the email.
            </p>
            {IS_DEMO && <p className="rounded-xl bg-soft px-4 py-3 text-sm">Demo: no email is sent. Type any 6 digits, e.g. 123456.</p>}
            <input
              className="input text-center text-2xl tracking-[0.5em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
            {error && <p className="error">{error}</p>}
            <button className="btn-primary w-full" disabled={busy || code.length < 6}>{busy ? "Checking…" : "Continue"}</button>
            <button type="button" className="btn w-full text-muted" onClick={() => { setSent(false); setCode(""); }}>
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
