import { NextResponse } from "next/server";
import { activatePass, hmac, safeEqual } from "@/lib/payments";
import { serverSupabase } from "@/lib/supabase/server";

// Called by the checkout popup after a successful payment.
export async function POST(request: Request) {
  const supabase = await serverSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();
  const expected = hmac(process.env.RAZORPAY_KEY_SECRET!, `${razorpay_order_id}|${razorpay_payment_id}`);
  if (!razorpay_signature || !safeEqual(expected, String(razorpay_signature))) {
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }
  try {
    await activatePass(razorpay_order_id, razorpay_payment_id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("activate failed", e);
    return NextResponse.json({ error: "We couldn't activate your pass yet. It will activate automatically shortly." }, { status: 500 });
  }
}
