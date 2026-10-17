import { NextResponse } from "next/server";
import { activatePass, hmac, safeEqual } from "@/lib/payments";

// Razorpay -> Lovira. Activates passes even if the user closed the browser before the checkout callback.
// Subscribe to "payment.captured" in the Razorpay dashboard.
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!safeEqual(hmac(process.env.RAZORPAY_WEBHOOK_SECRET!, raw), signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  const event = JSON.parse(raw);
  if (event.event === "payment.captured") {
    const p = event.payload?.payment?.entity;
    if (p?.order_id && p?.id) {
      try {
        await activatePass(p.order_id, p.id);
      } catch (e) {
        console.error("webhook activate failed", e);
        return NextResponse.json({ error: "retry" }, { status: 500 });
      }
    }
  }
  return NextResponse.json({ ok: true });
}
