import { NextResponse } from "next/server";
import { razorpay } from "@/lib/payments";
import { serverSupabase } from "@/lib/supabase/server";

// Creates a Razorpay order for a plan. The price always comes from the database, never the browser.
export async function POST(request: Request) {
  const supabase = await serverSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Please sign in" }, { status: 401 });

  const { plan_id } = await request.json();
  const { data: plan } = await supabase.from("plans").select("*").eq("id", plan_id).eq("active", true).single();
  if (!plan || plan.price_paise <= 0) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });

  try {
    const order = await razorpay().orders.create({
      amount: plan.price_paise,
      currency: "INR",
      receipt: `lv_${Date.now()}`,
      notes: { user_id: auth.user.id, plan_id: plan.id },
    });
    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      plan_name: plan.name,
      email: auth.user.email,
    });
  } catch (e) {
    console.error("razorpay order failed", e);
    return NextResponse.json({ error: "Payments are unavailable right now" }, { status: 502 });
  }
}
