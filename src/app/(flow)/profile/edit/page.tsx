"use client";

import { ProfileForm } from "@/components/ProfileForm";
import { Spinner } from "@/components/ui";
import { useRequire } from "@/lib/me";

export default function EditProfilePage() {
  const ok = useRequire("profile");
  return ok ? <ProfileForm mode="edit" /> : <Spinner />;
}
