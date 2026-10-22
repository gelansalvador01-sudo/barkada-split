"use client";

import { useState, type FormEvent } from "react";
import {
  GradientButton,
  StatusBar,
  ONBOARD,
} from "@/components/onboarding/primitives";
import { PasswordInput } from "@/components/onboarding/password-input";
import { SocialLoginPanel } from "@/components/onboarding/social-logins";
import { verifyLogin } from "@/lib/auth-store";
import { toast } from "@/lib/toast-bus";
import { ChevronLeftIcon } from "@/components/bs-icons";

const inputClass =
  "h-[52px] w-full rounded-2xl border border-[#C3B1E1]/20 bg-white/[0.05] px-4 text-[15px] font-medium text-white placeholder:text-white/25 transition focus:border-[#BD93F9]/60 focus:bg-white/[0.07] focus:outline-none";

/**
 * Login screen: email + password verification before entering the app.
 * Unknown credentials stay on this screen with an inline error.
 */
export function LoginScreen({
  onSuccess,
  onBack,
  onSignUp,
}: {
  onSuccess: () => void;
  onBack: () => void;
  onSignUp: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const ok = await verifyLogin({ email, password });
      if (ok) {
        onSuccess();
        return;
      }
      setError("Incorrect email or password. Check your details and try again.");
      setShakeKey((k) => k + 1);
    } catch {
      setError("Login could not be verified in this browser. Try again.");
      setShakeKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex h-full flex-col">
      <StatusBar />
      <div className="relative mt-2 flex items-center px-7">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to welcome"
          className="flex size-10 items-center justify-center rounded-full border border-[#C3B1E1]/15 bg-white/[0.04] text-white/80 transition hover:border-[#C3B1E1]/40 hover:text-white active:scale-[0.98]"
        >
          <ChevronLeftIcon className="size-5" />
        </button>
      </div>

      <div className="mt-8 px-7">
        <h2 className="font-display text-[28px] font-bold leading-tight tracking-tight text-white">
          Welcome back
        </h2>
        <p
          className="mt-2 text-[14px] font-medium leading-relaxed"
          style={{ color: ONBOARD.subtext }}
        >
          Log in with the email and password you registered to enter your
          bill-splitting dashboard.
        </p>
      </div>

      <form
        key={shakeKey}
        onSubmit={handleSubmit}
        className={`mt-8 flex flex-1 flex-col gap-4 px-7 pb-10 ${error ? "bs-shake" : ""}`}
      >
        <label className="block">
          <span className="mb-2 block text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: ONBOARD.subtext }}>
            Email
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@barkada.app"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>
        <PasswordInput
          id="login-password"
          label="Password"
          value={password}
          onChange={setPassword}
          placeholder="Your password"
          autoComplete="current-password"
        />

        {error ? (
          <p role="alert" className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-[13px] font-semibold text-rose-300">
            {error}
          </p>
        ) : null}

        <div className="mt-2">
          <GradientButton type="submit" disabled={busy} ariaLabel="Log in">
            {busy ? "Verifying…" : "Log in"}
          </GradientButton>
        </div>

        <p className="mt-4 text-center text-[13px] font-medium" style={{ color: ONBOARD.subtext }}>
          First time here?{" "}
          <button
            type="button"
            onClick={onSignUp}
            className="font-bold text-white underline-offset-4 transition hover:underline active:scale-[0.98]"
          >
            Create an account
          </button>
        </p>

        <SocialLoginPanel onDemo={(message) => toast(message)} />
      </form>
    </div>
  );
}
