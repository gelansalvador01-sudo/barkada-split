"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resetDemo } from "@/lib/barkada-store";
import { clearAccount, clearSession } from "@/lib/auth-store";
import { disconnectFreighterWallet } from "@/lib/freighter-wallet";
import { useProfile } from "@/lib/profile-store";
import type { Profile } from "@/lib/profile-store";
import { browserRequest } from "@/lib/browser-api";
import { toast } from "@/lib/toast-bus";
import { Screen } from "@/components/bs-screen";
import { BoltIcon, CheckIcon, ChevronLeftIcon } from "@/components/bs-icons";

const AVATAR_GRADIENTS = [
  "from-orchid to-violet-600",
  "from-fuchsia-500 to-rose-500",
  "from-lavender to-sky-500",
  "from-emerald-400 to-cyan-500",
  "from-amber-400 to-orange-500",
  "from-indigo-500 to-purple-600",
];

const ALERT_ROWS: {
  key: keyof Profile["alerts"];
  label: string;
  detail: string;
}[] = [
  { key: "push", label: "Push notifications", detail: "Nudges and settlement alerts" },
  { key: "email", label: "Email digest", detail: "Weekly summary of balances" },
  { key: "sms", label: "SMS alerts", detail: "Large settlements only" },
];

export function ProfileView() {
  const router = useRouter();
  const [profile, saveProfile] = useProfile();
  const [form, setForm] = useState<Profile>(profile);
  const [gradient, setGradient] = useState(0);
  const [savedFlash, setSavedFlash] = useState(false);
  const [checking, setChecking] = useState(false);
  const [connection, setConnection] = useState<"unknown" | "ready" | "failed">(
    "unknown",
  );

  // Sync the form once the persisted profile loads after hydration.
  useEffect(() => setForm(profile), [profile]);

  const initials =
    form.name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AJ";

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setForm((cur) => ({ ...cur, [key]: value }));
  }

  function toggleAlert(key: keyof Profile["alerts"]) {
    setForm((cur) => ({
      ...cur,
      alerts: { ...cur.alerts, [key]: !cur.alerts[key] },
    }));
  }

  function handleSave() {
    if (!form.name.trim()) {
      toast("Name can't be empty ✏️");
      return;
    }
    saveProfile({ ...form, name: form.name.trim() });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
    toast("Profile updated ✨");
  }

  function handleResetDemo() {
    resetDemo();
    toast("Demo data restored 🔄");
  }

  /** Replay the visual flow; the app gate asks for a log in afterwards. */
  function handleReplayOnboarding() {
    clearSession();
    router.push("/onboarding");
  }

  /** Wipe the stored account and start a fresh registration. */
  function handleCreateAnotherAccount() {
    clearAccount();
    clearSession();
    router.push("/onboarding?stage=signup");
  }

  /** End the session: disconnect the signing wallet and gate the app again. */
  function handleLogOut() {
    disconnectFreighterWallet();
    clearSession();
    router.replace("/onboarding");
  }

  /** Health-check the server-side Paiflow deployment (credentials + testnet). */
  function handleCheckConnection() {
    if (checking) return;
    setChecking(true);
    void browserRequest<{ ready: boolean }>("/api/integration")
      .then(() => {
        setConnection("ready");
        toast("Paidflow deployment connected — testnet native-XLM ready ⚡");
      })
      .catch((error: unknown) => {
        setConnection("failed");
        toast(
          error instanceof Error
            ? error.message
            : "Paidflow deployment is not reachable. Check the server environment.",
        );
      })
      .finally(() => setChecking(false));
  }

  const inputClass =
    "mt-2 w-full rounded-2xl border border-lavender/20 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-orchid/60 focus:outline-none";

  return (
    <Screen>
      <header className="relative flex items-center gap-3 px-5 pt-5">
        <button
          type="button"
          aria-label="Back"
          onClick={() => router.back()}
          className="grid size-10 place-items-center rounded-2xl border border-lavender/15 bg-white/[0.03] text-lavender transition hover:border-lavender/35 hover:bg-white/[0.08] hover:text-white active:scale-95"
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold">Profile & account</h1>
          <p className="text-xs text-white/45">How you appear to your barkada</p>
        </div>
      </header>

      <section className="px-5 pt-6">
        <div className="glass-card flex flex-col items-center rounded-3xl p-6">
          <button
            type="button"
            aria-label="Change avatar style"
            onClick={() => setGradient((cur) => (cur + 1) % AVATAR_GRADIENTS.length)}
            className={`grid size-20 place-items-center rounded-3xl bg-gradient-to-br font-display text-2xl font-bold text-white shadow-[0_0_30px_rgba(168,85,247,0.45)] transition hover:brightness-110 active:scale-95 ${AVATAR_GRADIENTS[gradient]}`}
          >
            {initials}
          </button>
          <p className="mt-2 text-[11px] text-white/35">
            Tap avatar to restyle
          </p>
          <p className="mt-3 font-display text-lg font-bold">{form.name || "—"}</p>
          <p className="text-xs text-white/45">{form.handle}</p>
          <span className="bs-badge badge-owed mt-3">
            <CheckIcon className="size-3" />
            Testnet wallet linked
          </span>
        </div>
      </section>

      <section className="px-5 pt-4">
        <div className="glass-card rounded-3xl p-4">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-lavender/60">
            Display name
            <input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Your name"
              className={inputClass}
            />
          </label>
          <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.18em] text-lavender/60">
            Handle
            <input
              value={form.handle}
              onChange={(e) =>
                update(
                  "handle",
                  e.target.value.startsWith("@")
                    ? e.target.value
                    : `@${e.target.value}`,
                )
              }
              placeholder="@handle"
              className={inputClass}
            />
          </label>
          <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.18em] text-lavender/60">
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="you@barkada.app"
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section className="px-5 pt-4">
        <div className="glass-card divide-y divide-white/5 rounded-3xl">
          {ALERT_ROWS.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-4 px-4 py-3.5">
              <div>
                <p className="text-sm font-medium">{row.label}</p>
                <p className="text-xs text-white/40">{row.detail}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.alerts[row.key]}
                aria-label={row.label}
                onClick={() => toggleAlert(row.key)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors hover:brightness-110 active:scale-95 ${
                  form.alerts[row.key]
                    ? "bg-gradient-to-r from-orchid to-violet-600 shadow-[0_0_14px_rgba(168,85,247,0.5)]"
                    : "border border-lavender/20 bg-white/5"
                }`}
              >
                <span
                  className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${
                    form.alerts[row.key] ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 pt-4">
        <div className="glass-card rounded-3xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Paidflow connection</p>
              <p className="text-xs text-white/40">
                {connection === "ready"
                  ? "Deployment reachable · testnet native-XLM"
                  : connection === "failed"
                    ? "Not reachable — check server environment"
                    : "Verify the server-side Paiflow deployment"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCheckConnection}
              disabled={checking}
              aria-label="Check Paidflow connection"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-orchid/40 bg-orchid/15 px-3.5 py-2 text-[11px] font-bold text-lavender transition hover:border-orchid/70 hover:bg-orchid/25 hover:text-white active:scale-95 disabled:opacity-60"
            >
              {checking ? (
                <span className="size-3 animate-spin rounded-full border-2 border-lavender/30 border-t-lavender" />
              ) : (
                <BoltIcon className="size-3" />
              )}
              {checking ? "Checking…" : "Check"}
            </button>
          </div>
        </div>
      </section>

      <section className="px-5 pt-4">
        <button
          type="button"
          onClick={handleSave}
          className="btn-settle w-full"
        >
          {savedFlash ? <CheckIcon className="size-4" /> : null}
          {savedFlash ? "Saved!" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={handleResetDemo}
          className="mt-3 w-full rounded-2xl border border-magenta/30 bg-magenta/10 py-3 text-sm font-semibold text-magenta transition hover:border-magenta/60 hover:bg-magenta/20 hover:text-white active:scale-[0.98]"
        >
          Reset demo data
        </button>
        <button
          type="button"
          onClick={handleReplayOnboarding}
          className="mt-3 w-full rounded-2xl border border-lavender/20 bg-white/[0.03] py-3 text-sm font-semibold text-lavender transition hover:border-lavender/45 hover:bg-white/[0.07] hover:text-white active:scale-[0.98]"
        >
          Replay onboarding
        </button>
        <button
          type="button"
          onClick={handleCreateAnotherAccount}
          className="mt-3 w-full rounded-2xl border border-mint/30 bg-mint/10 py-3 text-sm font-semibold text-mint transition hover:border-mint/60 hover:bg-mint/20 hover:text-white active:scale-[0.98]"
        >
          Create another account
        </button>
        <button
          type="button"
          onClick={handleLogOut}
          aria-label="Log out"
          className="mt-3 w-full rounded-2xl border border-rose-400/30 bg-rose-500/10 py-3 text-sm font-semibold text-rose-300 transition hover:border-rose-400/60 hover:bg-rose-500/20 hover:text-white active:scale-[0.98]"
        >
          Log out
        </button>
      </section>
    </Screen>
  );
}
