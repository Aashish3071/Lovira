"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { PageHeader, Spinner } from "@/components/ui";
import { passName, rupees } from "@/lib/constants";
import { useMe, useRequire } from "@/lib/me";
import { DemoCheckout } from "@/components/DemoCheckout";
import { api, IS_DEMO } from "@/lib/backend";
import type { Plan } from "@/lib/types";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function duration(hours: number) {
  if (hours <= 24) return "24 hours";
  if (hours <= 168) return "7 days";
  return `${Math.round(hours / 24)} days`;
}

export default function PremiumPage() {
  const ok = useRequire("profile");
  const { status, refresh } = useMe();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [demoPlan, setDemoPlan] = useState<Plan | null>(null);

  useEffect(() => {
    api.plans().then(setPlans);
  }, []);

  async function buy(plan: Plan) {
    setMessage(null);
    if (IS_DEMO) return setDemoPlan(plan);
    setBusy(plan.id);
    try {
      const res = await fetch("/api/payments/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: plan.id }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error);
      if (!window.Razorpay) throw new Error("Payment window didn't load. Check your connection and try again.");

      new window.Razorpay({
        key: order.key,
        order_id: order.order_id,
        amount: order.amount,
        currency: "INR",
        name: "Lovira",
        description: passName(order.plan_name),
        prefill: { email: order.email },
        theme: { color: "#e11d48" },
        modal: { ondismiss: () => setBusy(null) },
        handler: async (r: RazorpayResponse) => {
          const v = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(r),
          });
          const out = await v.json();
          await refresh();
          setBusy(null);
          setMessage(v.ok ? { ok: true, text: `Your ${passName(order.plan_name)} is active. Enjoy!` } : { ok: false, text: out.error });
        },
      }).open();
    } catch (e) {
      setBusy(null);
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Payment failed" });
    }
  }

  if (!ok || !plans || !status) return <Spinner />;

  const free = plans.find((p) => p.id === "free");
  const paid = plans.filter((p) => p.price_paise > 0);
  const endsAt = status.plan.ends_at ? new Date(status.plan.ends_at) : null;

  return (
    <div className="px-4">
      {!IS_DEMO && <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />}
      {demoPlan && (
        <DemoCheckout
          plan={demoPlan}
          onClose={() => setDemoPlan(null)}
          onPaid={async () => {
            const name = demoPlan.name;
            setDemoPlan(null);
            await refresh();
            setMessage({ ok: true, text: `Your ${passName(name)} is active. Enjoy!` });
          }}
        />
      )}
      <div className="-mx-4">
        <PageHeader title="Lovira passes" />
      </div>
      <p className="mb-4 text-muted">Pay only for the days you want. No auto-renewal, no subscription traps.</p>

      {endsAt && (
        <div className="mb-4 rounded-2xl bg-ok/10 p-4 text-sm text-ok">
          Your {passName(status.plan.name)} is active until {endsAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.
        </div>
      )}
      {message && <p className={`mb-4 rounded-xl px-4 py-3 text-sm ${message.ok ? "bg-ok/10 text-ok" : "error"}`}>{message.text}</p>}

      <div className="space-y-3">
        {paid.map((p, i) => (
          <div key={p.id} className={`card relative p-5 ${i === 0 ? "border-2 !border-brand" : ""}`}>
            {i === 0 && (
              <span className="absolute -top-3 left-5 rounded-full bg-brand px-3 py-0.5 text-xs font-semibold text-brand-fg">
                Only on Lovira
              </span>
            )}
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-xl font-bold">{p.name}</h2>
                <p className="text-sm text-muted">{duration(p.duration_hours)}</p>
              </div>
              <p className="text-3xl font-extrabold">{rupees(p.price_paise)}</p>
            </div>
            <ul className="my-4 space-y-1.5 text-sm">
              <li>✓ Up to {p.daily_limit} verified profiles a day</li>
              {p.can_see_likes && <li>✓ See everyone who liked you</li>}
              <li>✓ Pay with UPI, cards or netbanking</li>
            </ul>
            <button className="btn-primary w-full" disabled={!!busy} onClick={() => buy(p)}>
              {busy === p.id ? "Opening…" : status.plan.id === p.id ? "Extend" : `Get ${p.name}`}
            </button>
          </div>
        ))}
      </div>

      {free && (
        <p className="mt-6 text-center text-sm text-muted">
          Free forever: {free.daily_limit} verified profiles a day, unlimited matches and chat.
        </p>
      )}
      <p className="mt-2 pb-6 text-center text-xs text-muted">
        Prices include GST where applicable. Passes are for personal use and are non-refundable once active.
      </p>
    </div>
  );
}
