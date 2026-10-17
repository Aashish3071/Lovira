"use client";

import { useState } from "react";
import { REPORT_REASONS } from "@/lib/constants";
import { api } from "@/lib/backend";
import { Chips, errorText } from "./ui";

// Report and/or block someone. Blocking removes any match and hides both people from each other.
export function ReportDialog({ targetId, name, onClose, onBlocked }: {
  targetId: string;
  name: string;
  onClose: () => void;
  onBlocked: () => void;
}) {
  const [reason, setReason] = useState<string[]>([]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(alsoBlock: boolean) {
    setBusy(true);
    setError("");
    try {
      if (reason[0]) await api.report(targetId, reason[0], details || null);
      if (alsoBlock) {
        await api.block(targetId);
        onBlocked();
        return;
      }
      setSent(true);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-card p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-lg font-semibold">Thanks, we&apos;ll review this.</p>
            <p className="text-sm text-muted">Your report is private. {name} won&apos;t know it was you.</p>
            <button className="btn-ghost w-full" onClick={onClose}>Close</button>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Report or block {name}</h3>
            <Chips options={REPORT_REASONS} value={reason} onChange={setReason} />
            <textarea
              className="input min-h-20"
              placeholder="Anything else we should know? (optional)"
              maxLength={1000}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
            {error && <p className="error">{error}</p>}
            <div className="grid gap-2">
              <button className="btn-primary" disabled={busy || !reason[0]} onClick={() => submit(false)}>Send report</button>
              <button className="btn-ghost text-brand" disabled={busy} onClick={() => submit(true)}>
                {reason[0] ? "Report and block" : "Block"} {name}
              </button>
              <button className="btn text-muted" onClick={onClose}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
