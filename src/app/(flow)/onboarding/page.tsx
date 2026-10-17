"use client";

import { ProfileForm } from "@/components/ProfileForm";
import { Spinner } from "@/components/ui";
import { useRequire } from "@/lib/me";

export default function OnboardingPage() {
  const ok = useRequire("auth");
  return ok ? <ProfileForm mode="onboarding" /> : <Spinner />;
}
