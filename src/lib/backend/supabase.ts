import { resizeImage } from "../images";
import { supabase } from "../supabase/client";
import type { MatchSummary, Message, MyStatus, Plan, Profile } from "../types";
import type { AdminReport, Backend, Bucket, Feed, Likes, PendingVerification, Photo, SwipeResult } from "./types";

const sb = () => supabase();

function ok<T>({ data, error }: { data: T; error: unknown }): T {
  if (error) throw error;
  return data;
}

async function myId() {
  const { data } = await sb().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("Please sign in again");
  return id;
}

async function upload(bucket: Bucket, file: Blob) {
  const blob = await resizeImage(file);
  const path = `${await myId()}/${crypto.randomUUID()}.jpg`;
  ok(await sb().storage.from(bucket).upload(path, blob, { contentType: "image/jpeg" }));
  return path;
}

// Signed URLs are cached for the session so swiping doesn't re-request them.
const urlCache = new Map<string, string>();

// The real backend: Supabase database, storage and realtime.
export const supabaseBackend: Backend = {
  async getSession() {
    const { data } = await sb().auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
  },
  onAuthChange(cb) {
    const { data } = sb().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") cb();
    });
    return () => data.subscription.unsubscribe();
  },
  async sendCode(email) {
    ok(await sb().auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } }));
  },
  async verifyCode(email, code) {
    ok(await sb().auth.verifyOtp({ email, token: code, type: "email" }));
  },
  async signOut() {
    await sb().auth.signOut();
  },

  async myStatus() {
    return ok(await sb().rpc("my_status")) as MyStatus;
  },
  async getMyProfile() {
    return ok(await sb().from("profiles").select("*").eq("id", await myId()).maybeSingle()) as Profile | null;
  },
  async saveMyProfile(row, exists) {
    const id = await myId();
    ok(exists ? await sb().from("profiles").update(row).eq("id", id) : await sb().from("profiles").insert({ ...row, id }));
  },
  async myPhotos() {
    return (ok(
      await sb().from("photos").select("id, path, position").eq("user_id", await myId()).order("position").order("created_at"),
    ) ?? []) as Photo[];
  },
  async addPhoto(file, position) {
    const path = await upload("photos", file);
    ok(await sb().from("photos").insert({ user_id: await myId(), path, position }));
  },
  async removePhoto(p) {
    await sb().storage.from("photos").remove([p.path]);
    ok(await sb().from("photos").delete().eq("id", p.id));
  },
  async reorderPhotos(ids) {
    await Promise.all(ids.map((id, i) => sb().from("photos").update({ position: i }).eq("id", id)));
  },
  async imageUrls(bucket, paths) {
    const key = (p: string) => `${bucket}:${p}`;
    const missing = paths.filter((p) => p && !urlCache.has(key(p)));
    if (missing.length) {
      const { data } = await sb().storage.from(bucket).createSignedUrls(missing, 60 * 60);
      data?.forEach((d) => d.signedUrl && d.path && urlCache.set(key(d.path), d.signedUrl));
    }
    return paths.map((p) => urlCache.get(key(p)) ?? "");
  },

  async submitVerification(idType, selfie, idImage) {
    const selfiePath = await upload("verification", selfie);
    const idPath = await upload("verification", idImage);
    ok(await sb().rpc("submit_verification", { p_id_type: idType, p_selfie_path: selfiePath, p_id_path: idPath }));
  },
  async adminSelfVerify() {
    ok(await sb().rpc("admin_self_verify"));
  },

  async getFeed(batch) {
    return ok(await sb().rpc("get_feed", { batch })) as Feed;
  },
  async swipe(target, liked) {
    return ok(await sb().rpc("swipe", { target, p_liked: liked })) as SwipeResult;
  },
  async likesReceived() {
    return ok(await sb().rpc("likes_received")) as Likes;
  },

  async myMatches() {
    return (ok(await sb().rpc("my_matches")) ?? []) as MatchSummary[];
  },
  async matchDetail(matchId) {
    return ok(await sb().rpc("match_detail", { p_match_id: matchId }));
  },
  async messages(matchId) {
    return (ok(await sb().from("messages").select("*").eq("match_id", matchId).order("created_at").limit(500)) ?? []) as Message[];
  },
  async sendMessage(matchId, body) {
    return ok(await sb().from("messages").insert({ match_id: matchId, sender: await myId(), body }).select().single()) as Message;
  },
  onMessage(cb, matchId) {
    const channel = sb()
      .channel(`messages-${matchId ?? "all"}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", ...(matchId ? { filter: `match_id=eq.${matchId}` } : {}) },
        (payload) => cb(payload.new as Message),
      )
      .subscribe();
    return () => {
      sb().removeChannel(channel);
    };
  },
  async unmatch(matchId) {
    ok(await sb().rpc("unmatch", { p_match_id: matchId }));
  },

  async report(target, reason, details) {
    ok(await sb().from("reports").insert({ reporter: await myId(), reported: target, reason, details }));
  },
  async block(target) {
    ok(await sb().rpc("block_user", { target }));
  },

  async plans() {
    return (ok(await sb().from("plans").select("*").eq("active", true).order("sort")) ?? []) as Plan[];
  },

  async adminPending() {
    return (ok(await sb().rpc("admin_pending_verifications")) ?? []) as PendingVerification[];
  },
  async adminReview(item, approve, reason, suspend) {
    // Delete the ID image first: we never keep government IDs after review.
    if (item.id_path) ok(await sb().storage.from("verification").remove([item.id_path]));
    ok(await sb().rpc("admin_review", { target: item.user_id, approve, reason }));
    if (suspend) ok(await sb().rpc("admin_set_status", { target: item.user_id, p_status: "suspended" }));
  },
  async adminReports() {
    return (ok(await sb().rpc("admin_reports")) ?? []) as AdminReport[];
  },
  async adminReportAction(report, action) {
    if (action !== "resolve") {
      ok(await sb().rpc("admin_set_status", { target: report.reported.id, p_status: action === "suspend" ? "suspended" : "active" }));
    }
    ok(await sb().from("reports").update({ status: "resolved" }).eq("id", report.id));
  },
};
