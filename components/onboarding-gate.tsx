"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { hasAccount, hasSession } from "@/lib/auth-store";

/**
 * Session gate for the app screens: entering the app requires a verified
 * log in (or a completed sign-up), which sets the session flag. Visitors
 * without a session are redirected to /onboarding — straight to the log-in
 * form when an account exists, otherwise to sign-up. Children stay hidden
 * until the check resolves so the app never flashes before the redirect.
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (hasSession()) {
      setAllowed(true);
    } else {
      const stage = hasAccount() ? "login" : "welcome";
      router.replace(`/onboarding?stage=${stage}`);
    }
  }, [router]);

  if (!allowed) return null;
  return <>{children}</>;
}
