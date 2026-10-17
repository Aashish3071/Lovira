"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GENDERS, MIN_PHOTOS, ORIENTATIONS, PROMPTS, STATES } from "@/lib/constants";
import { useMe } from "@/lib/me";
import { supabase } from "@/lib/supabase/client";
import type { Profile, Prompt } from "@/lib/types";
import { PhotoManager } from "./PhotoManager";
import { Chips, Spinner, errorText } from "./ui";

const STEPS = ["About you", "Identity", "Photos", "Your story"];

type Form = Omit<Profile, "id" | "status">;

const EMPTY: Form = {
  name: "", dob: "", gender: "", gender_custom: "", orientations: [], show_me: [],
  age_min: 18, age_max: 40, city: "", state: "", bio: "", prompts: [],
};

function ageFrom(dob: string) {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age--;
  return age;
}

// Step-by-step profile form, used for first-time onboarding and for editing later.
export function ProfileForm({ mode }: { mode: "onboarding" | "edit" }) {
  const router = useRouter();
  const { user, refresh } = useMe();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(EMPTY);
  const [exists, setExists] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (!user) return;
    supabase()
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setF({ ...EMPTY, ...data, gender_custom: data.gender_custom ?? "", bio: data.bio ?? "" });
          setExists(true);
        }
        setLoaded(true);
      });
  }, [user]);

  function validate(): string | null {
    if (step === 0) {
      if (!f.name.trim()) return "Please add your first name.";
      if (!f.dob) return "Please add your date of birth.";
      if (ageFrom(f.dob) < 18) return "You must be 18 or older to use Lovira.";
      if (ageFrom(f.dob) > 100) return "Please check your date of birth.";
      if (!f.city.trim() || !f.state) return "Please add your city and state.";
    }
    if (step === 1) {
      if (!f.gender) return "Please choose your gender.";
      if (f.gender === "other" && !f.gender_custom?.trim()) return "Please describe your gender.";
      if (!f.show_me.length) return "Choose who you'd like to see.";
      if (f.age_min > f.age_max) return "Minimum age can't be above maximum age.";
    }
    if (step === 2 && photoCount < MIN_PHOTOS) return `Please add at least ${MIN_PHOTOS} photos.`;
    return null;
  }

  async function save() {
    const row = {
      id: user!.id,
      name: f.name.trim(),
      dob: f.dob,
      gender: f.gender,
      gender_custom: f.gender === "other" ? f.gender_custom?.trim() : null,
      orientations: f.orientations,
      show_me: f.show_me,
      age_min: f.age_min,
      age_max: f.age_max,
      city: f.city.trim(),
      state: f.state,
      bio: f.bio?.trim() || null,
      prompts: f.prompts.filter((p) => p.a.trim()),
    };
    const { error } = exists
      ? await supabase().from("profiles").update(row).eq("id", user!.id)
      : await supabase().from("profiles").insert(row);
    if (error) throw error;
    setExists(true);
  }

  async function next() {
    const problem = validate();
    if (problem) return setError(problem);
    setError("");
    setBusy(true);
    try {
      // The profile row must exist before photos can be attached to it.
      if (step === 1 || step === 3 || (mode === "edit" && step !== 2)) await save();
      if (step < STEPS.length - 1) {
        setStep(step + 1);
        window.scrollTo(0, 0);
      } else {
        await refresh();
        router.push(mode === "edit" ? "/profile" : "/verify");
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const setPrompt = (i: number, p: Prompt) => {
    const list = [...f.prompts];
    list[i] = p;
    set("prompts", list);
  };

  if (!user || !loaded) return <Spinner />;

  const maxDob = new Date();
  maxDob.setFullYear(maxDob.getFullYear() - 18);

  return (
    <div className="mx-auto max-w-md px-4 pb-32 pt-4">
      <div className="mb-6 flex gap-1.5">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            aria-label={s}
            disabled={mode === "onboarding" && i > step}
            onClick={() => setStep(i)}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`}
          />
        ))}
      </div>
      <p className="text-sm font-medium text-brand">Step {step + 1} of {STEPS.length}</p>
      <h1 className="mb-6 text-3xl font-bold">{STEPS[step]}</h1>

      {step === 0 && (
        <div className="space-y-5">
          <div>
            <label className="label" htmlFor="name">First name</label>
            <input id="name" className="input" maxLength={40} value={f.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="dob">Date of birth</label>
            <input
              id="dob"
              className="input"
              type="date"
              max={maxDob.toISOString().slice(0, 10)}
              value={f.dob}
              onChange={(e) => set("dob", e.target.value)}
            />
            <p className="mt-1 text-xs text-muted">Only your age is shown. You must be 18+.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="city">City</label>
              <input id="city" className="input" maxLength={60} value={f.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="state">State</label>
              <select id="state" className="input" value={f.state} onChange={(e) => set("state", e.target.value)}>
                <option value="">Select</option>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-7">
          <div>
            <p className="label">I am a…</p>
            <Chips options={GENDERS} value={f.gender ? [f.gender] : []} onChange={(v) => set("gender", v[0])} />
            {f.gender === "other" && (
              <input
                className="input mt-3"
                placeholder="How do you describe your gender?"
                maxLength={40}
                value={f.gender_custom ?? ""}
                onChange={(e) => set("gender_custom", e.target.value)}
              />
            )}
          </div>
          <div>
            <p className="label">My orientation <span className="font-normal text-muted">(optional, pick any)</span></p>
            <Chips multi options={ORIENTATIONS} value={f.orientations} onChange={(v) => set("orientations", v)} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <p className="label">Show me</p>
              <button
                type="button"
                className="text-sm font-medium text-brand"
                onClick={() => set("show_me", f.show_me.length === GENDERS.length ? [] : GENDERS.map((g) => g.value))}
              >
                {f.show_me.length === GENDERS.length ? "Clear" : "Everyone"}
              </button>
            </div>
            <Chips multi options={GENDERS} value={f.show_me} onChange={(v) => set("show_me", v)} />
          </div>
          <div>
            <p className="label">Age range: {f.age_min}–{f.age_max}</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number" className="input" min={18} max={100} aria-label="Minimum age"
                value={f.age_min} onChange={(e) => set("age_min", Math.max(18, Number(e.target.value) || 18))}
              />
              <input
                type="number" className="input" min={18} max={100} aria-label="Maximum age"
                value={f.age_max} onChange={(e) => set("age_max", Math.min(100, Number(e.target.value) || 18))}
              />
            </div>
          </div>
        </div>
      )}

      {step === 2 && <PhotoManager userId={user.id} onCountChange={setPhotoCount} />}

      {step === 3 && (
        <div className="space-y-6">
          <div>
            <label className="label" htmlFor="bio">Bio <span className="font-normal text-muted">(optional)</span></label>
            <textarea
              id="bio"
              className="input min-h-28"
              maxLength={500}
              placeholder="A few lines about you…"
              value={f.bio ?? ""}
              onChange={(e) => set("bio", e.target.value)}
            />
            <p className="mt-1 text-right text-xs text-muted">{(f.bio ?? "").length}/500</p>
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="card space-y-2 p-4">
              <select
                className="input"
                aria-label={`Prompt ${i + 1}`}
                value={f.prompts[i]?.q ?? ""}
                onChange={(e) => setPrompt(i, { q: e.target.value, a: f.prompts[i]?.a ?? "" })}
              >
                <option value="">Pick a prompt (optional)</option>
                {PROMPTS.filter((p) => p === f.prompts[i]?.q || !f.prompts.some((x) => x?.q === p)).map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              {f.prompts[i]?.q && (
                <input
                  className="input"
                  maxLength={150}
                  placeholder="Your answer"
                  value={f.prompts[i].a}
                  onChange={(e) => setPrompt(i, { ...f.prompts[i], a: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {error && <p className="error mt-6">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-bg/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex max-w-md gap-3">
          {step > 0 && (
            <button className="btn-ghost" disabled={busy} onClick={() => setStep(step - 1)}>Back</button>
          )}
          <button className="btn-primary flex-1" disabled={busy} onClick={next}>
            {busy ? "Saving…" : step < STEPS.length - 1 ? "Continue" : mode === "edit" ? "Save" : "Continue to verification"}
          </button>
        </div>
      </div>
    </div>
  );
}
