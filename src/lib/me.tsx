"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, type Session } from "./backend";
import { MIN_PHOTOS } from "./constants";
import type { MyStatus } from "./types";

type MeState = {
  loading: boolean;
  user: Session | null;
  status: MyStatus | null;
  refresh: () => Promise<void>;
};

const MeContext = createContext<MeState>({ loading: true, user: null, status: null, refresh: async () => {} });

export function MeProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<Session | null>(null);
  const [status, setStatus] = useState<MyStatus | null>(null);

  const refresh = useCallback(async () => {
    const session = await api.getSession();
    setUser(session);
    if (session) {
      setStatus(await api.myStatus());
    } else {
      setStatus(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    return api.onAuthChange(refresh);
  }, [refresh]);

  return <MeContext.Provider value={{ loading, user, status, refresh }}>{children}</MeContext.Provider>;
}

export const useMe = () => useContext(MeContext);

export type Level = "auth" | "profile" | "verified";

// Where a user should be sent if they don't meet `level`, or null if they do.
export function redirectFor(level: Level, user: Session | null, status: MyStatus | null): string | null {
  if (!user) return "/login";
  if (level === "auth") return null;
  if (!status?.has_profile || status.photo_count < MIN_PHOTOS) return "/onboarding";
  if (level === "profile") return null;
  if (status.account_status !== "active" || status.verification?.status !== "approved") return "/verify";
  return null;
}

// Redirects away from the page until the user reaches `level`. Returns true when the page may render.
export function useRequire(level: Level) {
  const { loading, user, status } = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const target = loading ? null : redirectFor(level, user, status);
  useEffect(() => {
    if (target && target !== pathname) router.replace(target);
  }, [target, pathname, router]);
  return !loading && !target;
}
