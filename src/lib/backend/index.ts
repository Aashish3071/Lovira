import { demoBackend } from "./demo";
import { supabaseBackend } from "./supabase";

// Demo mode runs the whole app in the browser on sample data (no Supabase, no Razorpay).
// It's on when NEXT_PUBLIC_DEMO_MODE=true, or automatically when no Supabase URL is configured.
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !process.env.NEXT_PUBLIC_SUPABASE_URL;

export const api = IS_DEMO ? demoBackend : supabaseBackend;
export type * from "./types";
