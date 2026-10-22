import { useEffect, useState } from "react";

export type Profile = {
  name: string;
  handle: string;
  email: string;
  alerts: { push: boolean; email: boolean; sms: boolean };
};

const KEY = "barkada-split:profile";

export const defaultProfile: Profile = {
  name: "Alex Juaneza",
  handle: "@alexj",
  email: "alex@barkada.app",
  alerts: { push: true, email: false, sms: true },
};

function load(): Profile {
  if (typeof window === "undefined") return defaultProfile;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...defaultProfile, ...(JSON.parse(raw) as Profile) };
  } catch {
    // Fall through to defaults.
  }
  return defaultProfile;
}

export function useProfile(): [Profile, (next: Profile) => void] {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setProfile(load());
    setMounted(true);
  }, []);
  function update(next: Profile): void {
    setProfile(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Storage blocked — state still updates in memory.
    }
  }
  return [mounted ? profile : defaultProfile, update];
}
