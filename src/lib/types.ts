export type Prompt = { q: string; a: string };

export type Profile = {
  id: string;
  name: string;
  dob: string;
  gender: string;
  gender_custom: string | null;
  orientations: string[];
  show_me: string[];
  age_min: number;
  age_max: number;
  city: string;
  state: string;
  bio: string | null;
  prompts: Prompt[];
  status: "active" | "suspended";
};

// What other people see. Never includes date of birth.
export type ProfileCard = {
  id: string;
  name: string;
  age: number;
  gender: string;
  gender_custom: string | null;
  orientations: string[];
  city: string;
  state: string;
  bio: string | null;
  prompts: Prompt[];
  verified: boolean;
  photos: string[];
};

export type MyStatus = {
  has_profile: boolean;
  photo_count: number;
  account_status: "active" | "suspended" | null;
  verification: { status: "pending" | "approved" | "rejected"; reject_reason: string | null } | null;
  is_admin: boolean;
  plan: { id: string; name: string; daily_limit: number; can_see_likes: boolean; ends_at: string | null };
  used_today: number;
  likes_count: number;
};

export type Plan = {
  id: string;
  name: string;
  price_paise: number;
  duration_hours: number;
  daily_limit: number;
  can_see_likes: boolean;
  sort: number;
};

export type MatchSummary = {
  match_id: string;
  profile: ProfileCard;
  last_message: string | null;
  last_sender: string | null;
  last_at: string;
};

export type Message = {
  id: number;
  match_id: string;
  sender: string;
  body: string;
  created_at: string;
};
