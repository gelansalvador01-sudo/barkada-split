"use client";

import type { ReactNode } from "react";
import {
  GradientButton,
  StatusBar,
  ONBOARD,
} from "@/components/onboarding/primitives";
import { CubeVaultHero } from "@/components/onboarding/illustrations";
import { ChevronLeftIcon, ShieldIcon, WalletIcon } from "@/components/bs-icons";

/** Glassmorphic secondary-method card with a nested icon badge. */
function MethodCard({
  title,
  body,
  icon,
  onSelect,
  badgeLabel,
}: {
  title: string;
  body: string;
  icon: ReactNode;
  onSelect: () => void;
  badgeLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${title}: ${body}`}
      className="glass-card flex min-h-[158px] flex-col items-start gap-2.5 rounded-3xl p-4 text-left transition-[transform,border-color] duration-150 hover:border-[#BD93F9]/45 active:scale-[0.98]"
    >
      <span
        aria-label={badgeLabel}
        className="flex size-10 items-center justify-center rounded-2xl border border-[#BD93F9]/30 bg-[#BD93F9]/12 text-[#C3B1E1]"
        style={{ boxShadow: "0 0 18px -6px rgba(124,58,237,0.7)" }}
      >
        {icon}
      </span>
      <span className="text-[14px] font-bold text-white">{title}</span>
      <span className="text-[11.5px] font-medium leading-relaxed" style={{ color: ONBOARD.subtext }}>
        {body}
      </span>
    </button>
  );
}

/**
 * Screen 2 — Authentication selector: "Seed phrase wallet".
 * Device status bar above a floating cube-vault illustration, narrative
 * copy, primary CTA, and a two-column glassmorphic "Other methods" grid.
 */
export function AuthScreen({
  onCreateWallet,
  onBack,
  onSelectMethod,
}: {
  onCreateWallet: () => void;
  onBack: () => void;
  onSelectMethod: (method: "keyless" | "hardware") => void;
}) {
  return (
    <div className="relative flex h-full flex-col">
      <StatusBar />

      {/* back + illustration */}
      <div className="relative mt-2 flex flex-col items-center px-7">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to welcome"
          className="absolute left-7 top-0 flex size-10 items-center justify-center rounded-full border border-[#C3B1E1]/15 bg-white/[0.04] text-white/80 transition hover:border-[#C3B1E1]/40 hover:text-white active:scale-[0.98]"
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <div className="mt-8 aspect-square w-full max-w-[260px]">
          <CubeVaultHero />
        </div>
      </div>

      {/* narrative block */}
      <div className="mt-4 px-7 text-center">
        <h2 className="font-display text-[26px] font-bold leading-tight tracking-tight text-white">
          Seed phrase wallet
        </h2>
        <p
          className="mx-auto mt-2.5 max-w-[310px] text-[13px] font-medium leading-relaxed"
          style={{ color: ONBOARD.subtext }}
        >
          When creating or recovery-linking a group wallet, keep your seed
          phrase safe with secure decentralized backups.
        </p>
      </div>

      {/* primary action */}
      <div className="mt-6 px-7">
        <GradientButton onClick={onCreateWallet} ariaLabel="Create seed phrase wallet">
          Create wallet
        </GradientButton>
      </div>

      {/* secondary methods */}
      <div className="mt-7 flex-1 px-7 pb-10">
        <div className="relative flex items-center" aria-hidden>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C3B1E1]/25 to-[#C3B1E1]/25" />
          <span
            className="px-3 text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{ color: ONBOARD.subtext }}
          >
            Other methods
          </span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#C3B1E1]/25 to-[#C3B1E1]/25" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MethodCard
            title="Keyless wallet"
            body="Enjoy MPC (Multi-Party Computation) safety with your social accounts."
            badgeLabel="Keyless MPC badge"
            icon={<ShieldIcon className="size-5" />}
            onSelect={() => onSelectMethod("keyless")}
          />
          <MethodCard
            title="Hardware wallet"
            body="Connect hardware wallets for maximum corporate treasury security."
            badgeLabel="Hardware device badge"
            icon={<WalletIcon className="size-5" />}
            onSelect={() => onSelectMethod("hardware")}
          />
        </div>
      </div>
    </div>
  );
}
