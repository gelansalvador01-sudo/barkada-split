"use client";

import { useState, type FormEvent } from "react";
import {
  GradientButton,
  StatusBar,
  ONBOARD,
} from "@/components/onboarding/primitives";
import { PasswordInput } from "@/components/onboarding/password-input";
import { SocialLoginPanel } from "@/components/onboarding/social-logins";
import { registerAccount } from "@/lib/auth-store";
import { toast } from "@/lib/toast-bus";
import { ChevronLeftIcon } from "@/components/bs-icons";

const inputClass =
  "h-[52px] w-full rounded-2xl border border-[#C3B1E1]/20 bg-white/[0.05] px-4 text-[15px] font-medium text-white placeholder:text-white/25 transition focus:border-[#BD93F9]/60 focus:bg-white/[0.07] focus:outline-none";

/**
 * Sign-up screen for first-time users: email, phone number, and a created
 * password (with confirmation). Validation errors surface inline; success
 * registers the account and opens a session.
 */
export function SignUpScreen({
  onSuccess,
  onBack,
  onLogIn,
}: {
  onSuccess: () => void;
  onBack: () => void;
  onLogIn: () => void;
}) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match. Re-enter them carefully.");
      setShakeKey((k) => k + 1);
      return;
    }
    setBusy(true);
    try {
      await registerAccount({ email, phone, password });
      onSuccess();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-up failed. Try again.");
      setShakeKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex h-full flex-col overflow-y-auto">
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

      <div className="mt-6 px-7">
        <h2 className="font-display text-[28px] font-bold leading-tight tracking-tight text-white">
          Create your account
        </h2>
        <p
          className="mt-2 text-[14px] font-medium leading-relaxed"
          style={{ color: ONBOARD.subtext }}
        >
          A few details to secure your group wallets — email, phone number,
          and a password you'll use to log in.
        </p>
      </div>

      <form
        key={shakeKey}
        onSubmit={handleSubmit}
        className={`mt-6 flex flex-1 flex-col gap-4 px-7 pb-10 ${error ? "bs-shake" : ""}`}
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
        <label className="block">
          <span className="mb-2 block text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: ONBOARD.subtext }}>
            Phone number
          </span>
          <input
            type="tel"
            required
            autoComplete="tel"
            placeholder="+63 917 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </label>
        <PasswordInput
          id="signup-password"
          label="Password"
          value={password}
          onChange={setPassword}
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />
        <PasswordInput
          id="signup-confirm"
          label="Confirm password"
          value={confirm}
          onChange={setConfirm}
          placeholder="Repeat your password"
          autoComplete="new-password"
        />

        {error ? (
          <p role="alert" className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-[13px] font-semibold text-rose-300">
            {error}
          </p>
        ) : null}

        <div className="mt-2">
          <GradientButton type="submit" disabled={busy} ariaLabel="Create account">
            {busy ? "Creating…" : "Create account"}
          </GradientButton>
        </div>

        <p className="mt-4 text-center text-[13px] font-medium" style={{ color: ONBOARD.subtext }}>
          Already registered?{" "}
          <button
            type="button"
            onClick={onLogIn}
            className="font-bold text-white underline-offset-4 transition hover:underline active:scale-[0.98]"
          >
            Log in
          </button>
        </p>

        <SocialLoginPanel onDemo={(message) => toast(message)} />
      </form>
    </div>
  );
}
