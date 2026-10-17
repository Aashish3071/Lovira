import "server-only";
import crypto from "node:crypto";
import Razorpay from "razorpay";
import { adminSupabase } from "./supabase/server";

export const razorpay = () =>
  new Razorpay({ key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! });

export function hmac(secret: string, payload: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Turns a successful Razorpay payment into an active pass. Safe to call more than once
// for the same payment (checkout callback and webhook both call it).
export async function activatePass(orderId: string, paymentId: string) {
  const rp = razorpay();
  const [order, payment] = await Promise.all([rp.orders.fetch(orderId), rp.payments.fetch(paymentId)]);
  if (payment.order_id !== orderId || !["captured", "authorized"].includes(payment.status)) {
    throw new Error("Payment not completed");
  }
  const userId = String(order.notes?.user_id ?? "");
  const planId = String(order.notes?.plan_id ?? "");

  const db = adminSupabase();
  const { data: plan } = await db.from("plans").select("*").eq("id", planId).single();
  if (!plan || !userId || Number(payment.amount) !== plan.price_paise) throw new Error("Order does not match plan");

  const { data: existing } = await db.from("subscriptions").select("id").eq("razorpay_payment_id", paymentId).maybeSingle();
  if (existing) return;

  // Buying the same pass again extends it instead of overlapping.
  const { data: active } = await db
    .from("subscriptions")
    .select("ends_at")
    .eq("user_id", userId)
    .eq("plan_id", planId)
    .gt("ends_at", new Date().toISOString())
    .order("ends_at", { ascending: false })
    .limit(1);
  const from = active?.[0] ? new Date(active[0].ends_at) : new Date();
  const ends = new Date(from.getTime() + plan.duration_hours * 3600 * 1000);

  const { error } = await db.from("subscriptions").insert({
    user_id: userId,
    plan_id: planId,
    starts_at: new Date().toISOString(),
    ends_at: ends.toISOString(),
    amount_paise: plan.price_paise,
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
  });
  // 23505 = the other caller (webhook or checkout) inserted it first.
  if (error && error.code !== "23505") throw error;
}
