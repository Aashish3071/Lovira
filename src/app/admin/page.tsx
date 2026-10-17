"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Logo, Spinner, errorText } from "@/components/ui";
import { ProfileView } from "@/components/ProfileView";
import { ID_TYPES, labelOf, REPORT_REASONS } from "@/lib/constants";
import { useSignedUrls } from "@/lib/images";
import { useMe, useRequire } from "@/lib/me";
import { supabase } from "@/lib/supabase/client";
import type { ProfileCard } from "@/lib/types";

type Pending = {
  user_id: string;
  id_type: string;
  selfie_path: string | null;
  id_path: string | null;
  submitted_at: string;
  dob: string;
  profile: ProfileCard;
};

type Report = {
  id: string;
  reason: string;
  details: string | null;
  created_at: string;
  reporter: { id: string; name: string };
  reported: { id: string; name: string; status: string; report_count: number };
};

export default function AdminPage() {
  const ok = useRequire("auth");
  const { status, loading } = useMe();
  const [tab, setTab] = useState<"verify" | "reports">("verify");
  const [pending, setPending] = useState<Pending[] | null>(null);
  const [reports, setReports] = useState<Report[] | null>(null);

  const load = useCallback(async () => {
    const sb = supabase();
    const [v, r] = await Promise.all([sb.rpc("admin_pending_verifications"), sb.rpc("admin_reports")]);
    setPending(v.data ?? []);
    setReports(r.data ?? []);
  }, []);

  useEffect(() => {
    if (ok && status?.is_admin) load();
  }, [ok, status?.is_admin, load]);

  if (!ok || loading) return <Spinner />;
  if (!status?.is_admin) {
    return <p className="p-8 text-center text-muted">This page is for Lovira admins only.</p>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16">
      <header className="flex items-center justify-between py-4">
        <Logo />
        <Link href="/profile" className="text-sm text-muted">Back to app</Link>
      </header>
      <h1 className="text-2xl font-bold">Admin</h1>
      <div className="my-4 flex gap-2">
        <button className="chip" aria-pressed={tab === "verify"} onClick={() => setTab("verify")}>
          Verifications {pending ? `(${pending.length})` : ""}
        </button>
        <button className="chip" aria-pressed={tab === "reports"} onClick={() => setTab("reports")}>
          Reports {reports ? `(${reports.length})` : ""}
        </button>
        <button className="chip ml-auto" onClick={load}>Refresh</button>
      </div>

      {tab === "verify" &&
        (!pending ? <Spinner /> : pending.length === 0 ? (
          <p className="py-16 text-center text-muted">No one is waiting for review. 🎉</p>
        ) : (
          <div className="space-y-6">
            {pending.map((p) => <VerificationCard key={p.user_id} item={p} onDone={load} />)}
          </div>
        ))}

      {tab === "reports" &&
        (!reports ? <Spinner /> : reports.length === 0 ? (
          <p className="py-16 text-center text-muted">No open reports.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => <ReportRow key={r.id} report={r} onDone={load} />)}
          </div>
        ))}
    </div>
  );
}

function VerificationCard({ item, onDone }: { item: Pending; onDone: () => void }) {
  const [selfieUrl, idUrl] = useSignedUrls([item.selfie_path ?? "", item.id_path ?? ""], "verification");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function review(approve: boolean, suspend = false) {
    if (!approve && !reason.trim()) return setError("Write a short reason the user will see.");
    setBusy(true);
    setError("");
    try {
      const sb = supabase();
      // Delete the ID image first: we never keep government IDs after review.
      if (item.id_path) {
        const { error } = await sb.storage.from("verification").remove([item.id_path]);
        if (error) throw error;
      }
      const { error } = await sb.rpc("admin_review", { target: item.user_id, approve, reason: reason.trim() || null });
      if (error) throw error;
      if (suspend) {
        const { error } = await sb.rpc("admin_set_status", { target: item.user_id, p_status: "suspended" });
        if (error) throw error;
      }
      onDone();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <div className="card grid gap-4 p-4 md:grid-cols-[220px_1fr_1fr]">
      <div className="mx-auto w-full max-w-[220px]">
        <ProfileView profile={item.profile} compact />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold">Live selfie</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {selfieUrl && <img src={selfieUrl} alt="Selfie" className="max-h-72 rounded-xl" />}
        <p className="text-sm text-muted">
          Submitted {new Date(item.submitted_at).toLocaleString("en-IN")}
          <br />DOB on profile: <strong className="text-fg">{item.dob}</strong> (age {item.profile.age})
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold">{labelOf(ID_TYPES, item.id_type)}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {idUrl ? <img src={idUrl} alt="ID document" className="max-h-72 rounded-xl" /> : <p className="text-sm text-muted">No ID image.</p>}
        <ul className="list-disc pl-5 text-xs text-muted">
          <li>Selfie matches the profile photos and the ID photo</li>
          <li>Name roughly matches, and the ID shows them as 18+</li>
          <li>ID is not edited, a screenshot of someone else, or a full Aadhaar number</li>
        </ul>
        <input
          className="input"
          placeholder="Reason if rejecting (user sees this)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {error && <p className="error">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={busy} onClick={() => review(true)}>Approve</button>
          <button className="btn-ghost" disabled={busy} onClick={() => review(false)}>Reject</button>
          <button className="btn-ghost text-brand" disabled={busy} onClick={() => review(false, true)}>Reject &amp; suspend</button>
        </div>
      </div>
    </div>
  );
}

function ReportRow({ report, onDone }: { report: Report; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const suspended = report.reported.status === "suspended";

  async function act(action: "resolve" | "suspend" | "unsuspend") {
    setBusy(true);
    const sb = supabase();
    if (action !== "resolve") {
      await sb.rpc("admin_set_status", { target: report.reported.id, p_status: action === "suspend" ? "suspended" : "active" });
    }
    await sb.from("reports").update({ status: "resolved" }).eq("id", report.id);
    onDone();
  }

  return (
    <div className="card flex flex-wrap items-start justify-between gap-3 p-4">
      <div>
        <p className="font-semibold">
          {report.reported.name}{" "}
          <span className="text-sm font-normal text-muted">
            · {labelOf(REPORT_REASONS, report.reason)} · {report.reported.report_count} report(s) total
            {suspended && " · suspended"}
          </span>
        </p>
        {report.details && <p className="mt-1 text-sm">{report.details}</p>}
        <p className="mt-1 text-xs text-muted">
          From {report.reporter.name} · {new Date(report.created_at).toLocaleString("en-IN")}
        </p>
      </div>
      <div className="flex gap-2">
        {suspended ? (
          <button className="btn-ghost !py-2" disabled={busy} onClick={() => act("unsuspend")}>Unsuspend</button>
        ) : (
          <button className="btn-ghost !py-2 text-brand" disabled={busy} onClick={() => act("suspend")}>Suspend</button>
        )}
        <button className="btn-ghost !py-2" disabled={busy} onClick={() => act("resolve")}>Dismiss</button>
      </div>
    </div>
  );
}
