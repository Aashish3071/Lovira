"use client";

// In-browser demo backend: sample people, no server, no real payments.
// Everything lives in this browser's localStorage so a demo survives a page refresh;
// demoTools.reset() starts over.
import { resizeImage } from "../images";
import type { MatchSummary, Message, MyStatus, Plan, Profile, ProfileCard } from "../types";
import data from "./demo-people.json";
import type { AdminReport, Backend, PendingVerification, Photo } from "./types";

type Person = ProfileCard & { dob: string; show_me: string[] };
type Applicant = { profile: Person; id_type: string; selfie_path: string; id_path: string };

const PEOPLE = data.people as Person[];
const APPLICANTS = data.applicants as Applicant[];
const ME_ID = "me";
const KEY = "lovira-demo-v1";

export const DEMO_PLANS: Plan[] = [
  { id: "free", name: "Free", price_paise: 0, duration_hours: 0, daily_limit: 150, can_see_likes: false, sort: 0 },
  { id: "day", name: "Day Pass", price_paise: 2900, duration_hours: 24, daily_limit: 600, can_see_likes: true, sort: 1 },
  { id: "week", name: "Week", price_paise: 9900, duration_hours: 168, daily_limit: 750, can_see_likes: true, sort: 2 },
  { id: "month", name: "Month", price_paise: 29900, duration_hours: 720, daily_limit: 900, can_see_likes: true, sort: 3 },
];

const REPLIES = [
  "Haha, that's the best opener I've had all week 😄",
  "Okay I'm curious now. Tell me more!",
  "Same here! What are you up to this weekend?",
  "Chai or coffee? This decides everything.",
  "I know a great little place for that. Want to check it out sometime?",
  "That sounds lovely. Saturday evening works for me 🙂",
];

type State = {
  session: { id: string; email: string } | null;
  me: Profile | null;
  photos: Photo[];
  verification: { status: "pending" | "approved" | "rejected"; reject_reason: string | null; id_type: string; selfie: string | null; id_image: string | null; submitted_at: string } | null;
  seeded: boolean;
  swipes: Record<string, boolean>;
  today: { day: string; count: number };
  likedMe: string[];
  matches: { id: string; person: string; created_at: string }[];
  messages: Message[];
  replyIndex: Record<string, number>;
  blocked: string[];
  suspended: string[];
  reviewed: Record<string, "approved" | "rejected">;
  reports: (AdminReport & { status: "open" | "resolved" })[];
  subscription: { plan_id: string; ends_at: string } | null;
};

const fresh = (): State => ({
  session: null, me: null, photos: [], verification: null, seeded: false, swipes: {},
  today: { day: "", count: 0 }, likedMe: [], matches: [], messages: [], replyIndex: {},
  blocked: [], suspended: [], reviewed: {}, reports: seedReports(), subscription: null,
});

function seedReports(): State["reports"] {
  const by = (name: string) => PEOPLE.find((p) => p.name === name)!;
  const make = (reporter: string, reported: string, reason: string, details: string, hoursAgo: number) => ({
    id: `r-${reporter}-${reported}`, reason, details, status: "open" as const,
    created_at: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
    reporter: { id: by(reporter).id, name: reporter },
    reported: { id: by(reported).id, name: reported, status: "active", report_count: 1 },
  });
  return [
    make("Meera", "Karan", "scam", "Asked me to send money for a 'medical emergency' on the second message.", 3),
    make("Ananya", "Yash", "harassment", "Kept messaging after I said I wasn't interested.", 20),
  ];
}

let state: State = fresh();
let loaded = false;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...fresh(), ...JSON.parse(raw) };
  } catch {
    // Private mode or blocked storage: the demo still works, it just won't survive a refresh.
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full (large photos) or blocked; keep going in memory.
  }
}

function s() {
  load();
  return state;
}

const authListeners = new Set<() => void>();
const messageListeners = new Set<{ cb: (m: Message) => void; matchId?: string }>();
const emitAuth = () => authListeners.forEach((l) => l());
const emitMessage = (m: Message) => messageListeners.forEach((l) => (!l.matchId || l.matchId === m.match_id) && l.cb(m));

const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const uid = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/[^a-z0-9-]/gi, "");
const todayKey = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

function ageOf(dob: string) {
  const d = new Date(dob);
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
}

const card = (p: Person): ProfileCard => ({
  id: p.id, name: p.name, age: p.age, gender: p.gender, gender_custom: p.gender_custom, orientations: p.orientations,
  city: p.city, state: p.state, bio: p.bio, prompts: p.prompts, verified: true, photos: p.photos,
});

// Sample people plus applicants the admin has approved.
function pool(): Person[] {
  const st = s();
  const approved = APPLICANTS.filter((a) => st.reviewed[a.profile.id] === "approved").map((a) => a.profile);
  return [...PEOPLE, ...approved].filter((p) => !st.suspended.includes(p.id) && !st.blocked.includes(p.id));
}
const person = (id: string) => [...PEOPLE, ...APPLICANTS.map((a) => a.profile)].find((p) => p.id === id);

function compatible(p: Person) {
  const me = s().me;
  if (!me) return false;
  const myAge = ageOf(me.dob);
  return me.show_me.includes(p.gender) && p.show_me.includes(me.gender) && p.age >= me.age_min && p.age <= me.age_max && myAge >= 18 && myAge <= 60;
}

function plan(): Plan {
  const sub = s().subscription;
  if (sub && new Date(sub.ends_at) > new Date()) return DEMO_PLANS.find((p) => p.id === sub.plan_id)!;
  return DEMO_PLANS[0];
}

function usedToday() {
  const st = s();
  return st.today.day === todayKey() ? st.today.count : 0;
}

const isVerified = () => s().verification?.status === "approved";

// Once you're verified, a few people have already liked you and you have two matches,
// so every screen has something to show.
function seedSocial() {
  const st = s();
  if (st.seeded || !st.me || !isVerified()) return;
  const fits = pool().filter(compatible);
  const others = fits.length >= 4 ? fits : pool().filter((p) => p.show_me.includes(st.me!.gender));
  const shuffled = [...others].sort((a, b) => (a.id < b.id ? -1 : 1));
  const [chatMatch, newMatch, ...rest] = shuffled;
  const now = Date.now();
  if (chatMatch) {
    const id = `m-${chatMatch.id}`;
    st.matches.push({ id, person: chatMatch.id, created_at: new Date(now - 3 * 3600_000).toISOString() });
    st.swipes[chatMatch.id] = true;
    const lines: [string, string][] = [
      [chatMatch.id, "Hey! Your profile genuinely made me smile 😊"],
      [ME_ID, "Haha thank you! Loved your answer about Sundays."],
      [chatMatch.id, "Okay important question: chai or coffee?"],
    ];
    lines.forEach(([sender, body], i) =>
      st.messages.push({ id: now - 10_000 + i, match_id: id, sender, body, created_at: new Date(now - (150 - i * 20) * 60_000).toISOString() }),
    );
  }
  if (newMatch) {
    st.matches.push({ id: `m-${newMatch.id}`, person: newMatch.id, created_at: new Date(now - 20 * 60_000).toISOString() });
    st.swipes[newMatch.id] = true;
  }
  // People in the feed who already liked you; liking them back is an instant match.
  st.likedMe = rest.filter((_, i) => i % 2 === 1).slice(0, 4).map((p) => p.id);
  st.seeded = true;
  save();
}

function matchSummary(m: State["matches"][number]): MatchSummary | null {
  const p = person(m.person);
  if (!p) return null;
  const last = [...s().messages].reverse().find((x) => x.match_id === m.id);
  return { match_id: m.id, profile: card(p), last_message: last?.body ?? null, last_sender: last?.sender ?? null, last_at: last?.created_at ?? m.created_at };
}

function requireMe() {
  const st = s();
  if (!st.session) throw new Error("Please sign in again");
  return st;
}

async function toDataUrl(file: Blob, max: number) {
  const blob = await resizeImage(file, max, 0.8);
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read image"));
    r.readAsDataURL(blob);
  });
}

function scheduleReply(matchId: string) {
  const st = s();
  const m = st.matches.find((x) => x.id === matchId);
  if (!m) return;
  setTimeout(() => {
    const now = s();
    if (!now.matches.some((x) => x.id === matchId)) return;
    const i = now.replyIndex[matchId] ?? 0;
    now.replyIndex[matchId] = i + 1;
    const msg: Message = { id: Date.now(), match_id: matchId, sender: m.person, body: REPLIES[i % REPLIES.length], created_at: new Date().toISOString() };
    now.messages.push(msg);
    save();
    emitMessage(msg);
  }, 1500 + Math.random() * 1500);
}

export const demoBackend: Backend = {
  async getSession() {
    const st = s();
    return st.session ? { id: st.session.id, email: st.session.email } : null;
  },
  onAuthChange(cb) {
    authListeners.add(cb);
    return () => authListeners.delete(cb);
  },
  async sendCode() {
    await wait(400);
  },
  async verifyCode(email, code) {
    await wait(300);
    if (!/^\d{6}$/.test(code)) throw new Error("Enter any 6 digits");
    s().session = { id: ME_ID, email };
    save();
    emitAuth();
  },
  async signOut() {
    s().session = null;
    save();
    emitAuth();
  },

  async myStatus(): Promise<MyStatus | null> {
    const st = s();
    if (!st.session) return null;
    seedSocial();
    const pl = plan();
    const likes = await demoBackend.likesReceived();
    return {
      has_profile: !!st.me,
      photo_count: st.photos.length,
      account_status: st.me ? "active" : null,
      verification: st.verification ? { status: st.verification.status, reject_reason: st.verification.reject_reason } : null,
      is_admin: true,
      plan: { id: pl.id, name: pl.name, daily_limit: pl.daily_limit, can_see_likes: pl.can_see_likes, ends_at: pl.id === "free" ? null : st.subscription!.ends_at },
      used_today: usedToday(),
      likes_count: likes.count,
    };
  },
  async getMyProfile() {
    return s().me;
  },
  async saveMyProfile(row) {
    const st = requireMe();
    if (ageOf(row.dob) < 18) throw new Error("You must be 18 or older to use Lovira");
    st.me = { ...row, id: ME_ID, status: "active" };
    save();
  },
  async myPhotos() {
    return [...s().photos].sort((a, b) => a.position - b.position);
  },
  async addPhoto(file, position) {
    const st = requireMe();
    st.photos.push({ id: uid(), path: await toDataUrl(file, 900), position });
    save();
  },
  async removePhoto(p) {
    const st = s();
    st.photos = st.photos.filter((x) => x.id !== p.id);
    save();
  },
  async reorderPhotos(ids) {
    s().photos.forEach((p) => (p.position = ids.indexOf(p.id)));
    save();
  },
  async imageUrls(_bucket, paths) {
    return paths; // demo "paths" are already URLs (sample pictures or data: URLs)
  },

  async submitVerification(idType, selfie, idImage) {
    const st = requireMe();
    await wait(600);
    st.verification = {
      status: "pending", reject_reason: null, id_type: idType, submitted_at: new Date().toISOString(),
      selfie: await toDataUrl(selfie, 600), id_image: await toDataUrl(idImage, 900),
    };
    save();
  },
  async adminSelfVerify() {
    const st = requireMe();
    st.verification = { status: "approved", reject_reason: null, id_type: "pan", selfie: st.verification?.selfie ?? null, id_image: null, submitted_at: new Date().toISOString() };
    save();
    seedSocial();
  },

  async getFeed(batch) {
    const st = requireMe();
    if (!isVerified()) throw new Error("Verify your profile to see the feed");
    seedSocial();
    await wait(300);
    const me = st.me!;
    const remaining = Math.max(plan().daily_limit - usedToday(), 0);
    const rank = (p: Person) => (p.city === me.city ? 0 : p.state === me.state ? 1 : 2);
    const list = pool()
      .filter((p) => compatible(p) && !(p.id in st.swipes) && !st.matches.some((m) => m.person === p.id))
      .sort((a, b) => rank(a) - rank(b));
    // Put someone who already likes you second, so the "It's a match" moment comes quickly.
    const liker = list.findIndex((p) => st.likedMe.includes(p.id));
    if (liker !== -1 && liker !== 1 && list.length > 1) list.splice(1, 0, ...list.splice(liker, 1));
    return { remaining, profiles: list.slice(0, Math.min(batch, remaining)).map(card) };
  },
  async swipe(target, liked) {
    const st = requireMe();
    if (usedToday() >= plan().daily_limit) throw new Error("Daily limit reached");
    await wait(150);
    st.swipes[target] = liked;
    st.today = { day: todayKey(), count: usedToday() + 1 };
    let match_id: string | null = null;
    // People who already liked you match instantly; others sometimes like you back.
    if (liked && (st.likedMe.includes(target) || Math.random() < 0.25)) {
      match_id = `m-${target}`;
      if (!st.matches.some((m) => m.id === match_id)) st.matches.push({ id: match_id, person: target, created_at: new Date().toISOString() });
      st.likedMe = st.likedMe.filter((x) => x !== target);
    }
    save();
    return { matched: !!match_id, match_id };
  },
  async likesReceived() {
    const st = s();
    const ids = st.likedMe.filter((id) => !(id in st.swipes) && pool().some((p) => p.id === id));
    const canSee = plan().can_see_likes;
    return { count: ids.length, can_see: canSee, profiles: canSee ? ids.map((id) => card(person(id)!)) : [] };
  },

  async myMatches() {
    const st = requireMe();
    seedSocial();
    return st.matches
      .filter((m) => !st.blocked.includes(m.person))
      .map(matchSummary)
      .filter((x): x is MatchSummary => !!x)
      .sort((a, b) => b.last_at.localeCompare(a.last_at));
  },
  async matchDetail(matchId) {
    const m = s().matches.find((x) => x.id === matchId);
    const p = m && person(m.person);
    return m && p && !s().blocked.includes(p.id) ? { match_id: m.id, profile: card(p) } : null;
  },
  async messages(matchId) {
    return s().messages.filter((m) => m.match_id === matchId);
  },
  async sendMessage(matchId, body) {
    const st = requireMe();
    const msg: Message = { id: Date.now(), match_id: matchId, sender: ME_ID, body, created_at: new Date().toISOString() };
    st.messages.push(msg);
    save();
    setTimeout(() => emitMessage(msg), 0);
    scheduleReply(matchId);
    return msg;
  },
  onMessage(cb, matchId) {
    const l = { cb, matchId };
    messageListeners.add(l);
    return () => messageListeners.delete(l);
  },
  async unmatch(matchId) {
    const st = s();
    st.matches = st.matches.filter((m) => m.id !== matchId);
    st.messages = st.messages.filter((m) => m.match_id !== matchId);
    save();
  },

  async report(target, reason, details) {
    const st = requireMe();
    const p = person(target);
    st.reports.unshift({
      id: uid(), reason, details, status: "open", created_at: new Date().toISOString(),
      reporter: { id: ME_ID, name: st.me?.name ?? "You" },
      reported: { id: target, name: p?.name ?? "Unknown", status: "active", report_count: 1 },
    });
    save();
  },
  async block(target) {
    const st = s();
    st.blocked.push(target);
    const gone = st.matches.filter((m) => m.person === target).map((m) => m.id);
    st.matches = st.matches.filter((m) => m.person !== target);
    st.messages = st.messages.filter((m) => !gone.includes(m.match_id));
    save();
  },

  async plans() {
    return DEMO_PLANS;
  },

  async adminPending() {
    const st = s();
    await wait(200);
    const list: PendingVerification[] = APPLICANTS.filter((a) => !st.reviewed[a.profile.id]).map((a, i) => ({
      user_id: a.profile.id, id_type: a.id_type, selfie_path: a.selfie_path, id_path: a.id_path,
      submitted_at: new Date(Date.now() - (i + 1) * 47 * 60_000).toISOString(), dob: a.profile.dob,
      profile: { ...card(a.profile), verified: false },
    }));
    if (st.me && st.verification?.status === "pending") {
      list.unshift({
        user_id: ME_ID, id_type: st.verification.id_type, selfie_path: st.verification.selfie, id_path: st.verification.id_image,
        submitted_at: st.verification.submitted_at, dob: st.me.dob,
        profile: {
          id: ME_ID, name: st.me.name, age: ageOf(st.me.dob), gender: st.me.gender, gender_custom: st.me.gender_custom,
          orientations: st.me.orientations, city: st.me.city, state: st.me.state, bio: st.me.bio, prompts: st.me.prompts,
          verified: false, photos: [...st.photos].sort((a, b) => a.position - b.position).map((p) => p.path),
        },
      });
    }
    return list;
  },
  async adminReview(item, approve, reason, suspend) {
    const st = s();
    await wait(300);
    if (item.user_id === ME_ID && st.verification) {
      // As in the real app, the ID image is deleted once reviewed.
      st.verification = { ...st.verification, status: approve ? "approved" : "rejected", reject_reason: approve ? null : reason, id_image: null };
      save();
      seedSocial();
      return;
    }
    st.reviewed[item.user_id] = approve ? "approved" : "rejected";
    if (suspend) st.suspended.push(item.user_id);
    save();
  },
  async adminReports() {
    const st = s();
    return st.reports
      .filter((r) => r.status === "open")
      .map((r) => ({ ...r, reported: { ...r.reported, status: st.suspended.includes(r.reported.id) ? "suspended" : "active" } }));
  },
  async adminReportAction(report, action) {
    const st = s();
    if (action === "suspend") st.suspended.push(report.reported.id);
    if (action === "unsuspend") st.suspended = st.suspended.filter((x) => x !== report.reported.id);
    st.reports = st.reports.map((r) => (r.id === report.id ? { ...r, status: "resolved" } : r));
    save();
  },
};

// Demo-only helpers used by the login, verification, premium and profile screens.
export const demoTools = {
  // A ready-made, verified account so a demo can jump straight to the feed.
  async useSampleAccount() {
    state = fresh();
    loaded = true;
    state.session = { id: ME_ID, email: "demo@lovira.app" };
    state.me = {
      id: ME_ID, name: "Aarav", dob: `${new Date().getFullYear() - 27}-03-14`, gender: "man", gender_custom: null,
      orientations: ["straight"], show_me: ["woman"], age_min: 21, age_max: 35, city: "Mumbai", state: "Maharashtra",
      bio: "Product guy, weekend cricketer, always up for street food.", status: "active",
      prompts: [{ q: "A perfect Sunday looks like…", a: "Carter Road walk, then a long brunch." }],
    };
    state.photos = data.me.map((path, i) => ({ id: `me-${i}`, path, position: i }));
    state.verification = { status: "approved", reject_reason: null, id_type: "pan", selfie: null, id_image: null, submitted_at: new Date().toISOString() };
    save();
    seedSocial();
    emitAuth();
  },
  async buyPass(planId: string) {
    const st = requireMe();
    const p = DEMO_PLANS.find((x) => x.id === planId)!;
    await wait(1200);
    const current = st.subscription?.plan_id === planId && new Date(st.subscription.ends_at) > new Date() ? new Date(st.subscription.ends_at) : new Date();
    st.subscription = { plan_id: planId, ends_at: new Date(current.getTime() + p.duration_hours * 3600_000).toISOString() };
    save();
  },
  reset() {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    state = fresh();
    loaded = true;
    emitAuth();
  },
};
