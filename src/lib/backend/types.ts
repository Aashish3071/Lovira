import type { MatchSummary, Message, MyStatus, Plan, Profile, ProfileCard } from "../types";

export type Bucket = "photos" | "verification";
export type Session = { id: string; email: string | null };
export type Photo = { id: string; path: string; position: number };
export type Feed = { remaining: number; profiles: ProfileCard[] };
export type Likes = { count: number; can_see: boolean; profiles: ProfileCard[] };
export type SwipeResult = { matched: boolean; match_id: string | null };
export type ProfileInput = Omit<Profile, "status">;

export type PendingVerification = {
  user_id: string;
  id_type: string;
  selfie_path: string | null;
  id_path: string | null;
  submitted_at: string;
  dob: string;
  profile: ProfileCard;
};

export type AdminReport = {
  id: string;
  reason: string;
  details: string | null;
  created_at: string;
  reporter: { id: string; name: string };
  reported: { id: string; name: string; status: string; report_count: number };
};

// Everything the screens need from the server. Implemented by the live Supabase
// backend and by the in-browser demo backend.
export interface Backend {
  getSession(): Promise<Session | null>;
  onAuthChange(cb: () => void): () => void;
  sendCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  signOut(): Promise<void>;

  myStatus(): Promise<MyStatus | null>;
  getMyProfile(): Promise<Profile | null>;
  saveMyProfile(row: ProfileInput, exists: boolean): Promise<void>;
  myPhotos(): Promise<Photo[]>;
  addPhoto(file: Blob, position: number): Promise<void>;
  removePhoto(photo: Photo): Promise<void>;
  reorderPhotos(ids: string[]): Promise<void>;
  /** Turns stored photo paths into URLs an <img> can show. */
  imageUrls(bucket: Bucket, paths: string[]): Promise<string[]>;

  submitVerification(idType: string, selfie: Blob, idImage: Blob): Promise<void>;
  adminSelfVerify(): Promise<void>;

  getFeed(batch: number): Promise<Feed>;
  swipe(target: string, liked: boolean): Promise<SwipeResult>;
  likesReceived(): Promise<Likes>;

  myMatches(): Promise<MatchSummary[]>;
  matchDetail(matchId: string): Promise<{ match_id: string; profile: ProfileCard } | null>;
  messages(matchId: string): Promise<Message[]>;
  sendMessage(matchId: string, body: string): Promise<Message>;
  /** Calls `cb` for every new message in my chats (or only `matchId`). Returns unsubscribe. */
  onMessage(cb: (m: Message) => void, matchId?: string): () => void;
  unmatch(matchId: string): Promise<void>;

  report(target: string, reason: string, details: string | null): Promise<void>;
  block(target: string): Promise<void>;

  plans(): Promise<Plan[]>;

  adminPending(): Promise<PendingVerification[]>;
  adminReview(item: PendingVerification, approve: boolean, reason: string | null, suspend: boolean): Promise<void>;
  adminReports(): Promise<AdminReport[]>;
  adminReportAction(report: AdminReport, action: "resolve" | "suspend" | "unsuspend"): Promise<void>;
}
