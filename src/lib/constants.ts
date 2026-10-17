export const GENDERS = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "non_binary", label: "Non-binary" },
  { value: "trans_woman", label: "Trans woman" },
  { value: "trans_man", label: "Trans man" },
  { value: "genderqueer", label: "Genderqueer" },
  { value: "other", label: "Other" },
] as const;

export const ORIENTATIONS = [
  { value: "straight", label: "Straight" },
  { value: "gay", label: "Gay" },
  { value: "lesbian", label: "Lesbian" },
  { value: "bisexual", label: "Bisexual" },
  { value: "pansexual", label: "Pansexual" },
  { value: "asexual", label: "Asexual" },
  { value: "demisexual", label: "Demisexual" },
  { value: "queer", label: "Queer" },
  { value: "questioning", label: "Questioning" },
] as const;

export const ID_TYPES = [
  { value: "pan", label: "PAN card" },
  { value: "driving_licence", label: "Driving licence" },
  { value: "passport", label: "Passport" },
  { value: "voter_id", label: "Voter ID" },
  { value: "masked_aadhaar", label: "Masked Aadhaar (first 8 digits hidden)" },
] as const;

export const REPORT_REASONS = [
  { value: "fake_profile", label: "Fake profile" },
  { value: "scam", label: "Scam or asking for money" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate_photos", label: "Inappropriate photos" },
  { value: "underage", label: "Looks under 18" },
  { value: "other", label: "Something else" },
] as const;

export const PROMPTS = [
  "A perfect Sunday looks like…",
  "I'm looking for…",
  "My go-to chai/coffee order…",
  "Two truths and a lie…",
  "The way to win me over is…",
  "My favourite place in my city…",
  "I geek out on…",
  "A green flag I look for…",
];

export const STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
  "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
];

export const MIN_PHOTOS = 2;
export const MAX_PHOTOS = 6;

export const labelOf = (list: readonly { value: string; label: string }[], value: string) =>
  list.find((x) => x.value === value)?.label ?? value;

export function genderLabel(gender: string, custom?: string | null) {
  return gender === "other" && custom ? custom : labelOf(GENDERS, gender);
}

// "Day Pass" stays as is; "Week" becomes "Week pass".
export const passName = (name: string) => (/pass$/i.test(name) ? name : `${name} pass`);

export const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
