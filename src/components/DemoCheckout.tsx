"use client";

import { useState } from "react";
import { demoTools } from "@/lib/backend/demo";
import { passName, rupees } from "@/lib/constants";
import type { Plan } from "@/lib/types";

const APPS = ["Google Pay", "PhonePe", "Paytm", "BHIM"];

// Stand-in for the Razorpay checkout in demo mode. Nothing is charged.
export function DemoCheckout({ plan, onClose, onPaid }: { plan: Plan; onClose: () => void; onPaid: () => void }) {
  const [method, setMethod] = useState<"upi" | "card">("upi");
  const [app, setApp] = useState(APPS[0]);
  const [step, setStep] = useState<"choose" | "paying" | "done">("choose");

  async function pay() {
    setStep("paying");
    await demoTools.buyPass(plan.id);
    setStep("done");
    setTimeout(onPaid, 1100);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={step === "choose" ? onClose : undefined}>
      <div className="w-full max-w-md overflow-hidden rounded-t-3xl bg-card sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between bg-gradient-to-r from-brand to-brand-2 px-5 py-4 text-brand-fg">
          <div>
            <p className="text-sm opacity-90">Lovira · {plan.name}</p>
            <p className="text-2xl font-bold">{rupees(plan.price_paise)}</p>
          </div>
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">Demo payment</span>
        </div>

        {step === "choose" && (
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-2">
              <button className="chip !rounded-xl !py-3" aria-pressed={method === "upi"} onClick={() => setMethod("upi")}>UPI</button>
              <button className="chip !rounded-xl !py-3" aria-pressed={method === "card"} onClick={() => setMethod("card")}>Card</button>
            </div>
            {method === "upi" ? (
              <div className="grid grid-cols-2 gap-2">
                {APPS.map((a) => (
                  <button key={a} className="chip !rounded-xl" aria-pressed={app === a} onClick={() => setApp(a)}>{a}</button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <input className="input" value="4111 1111 1111 1111" readOnly aria-label="Card number (demo)" />
                <div className="grid grid-cols-2 gap-2">
                  <input className="input" value="12/30" readOnly aria-label="Expiry (demo)" />
                  <input className="input" value="•••" readOnly aria-label="CVV (demo)" />
                </div>
              </div>
            )}
            <p className="text-center text-xs text-muted">This is a demo. No money is charged. Real payments will use Razorpay.</p>
            <button className="btn-primary w-full" onClick={pay}>
              Pay {rupees(plan.price_paise)} {method === "upi" ? `with ${app}` : ""}
            </button>
            <button className="btn w-full text-muted" onClick={onClose}>Cancel</button>
          </div>
        )}

        {step !== "choose" && (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            {step === "paying" ? (
              <>
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-brand" />
                <p className="font-medium">Processing payment…</p>
              </>
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ok text-3xl text-white">✓</div>
                <p className="text-lg font-semibold">Payment successful</p>
                <p className="text-sm text-muted">Your {passName(plan.name)} is now active.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
