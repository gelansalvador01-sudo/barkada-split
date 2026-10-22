"use client";

import { GradientButton, ONBOARD } from "@/components/onboarding/primitives";
import { HandGlobeHero } from "@/components/onboarding/illustrations";

/**
 * Screen 1 — Welcome hub: "Your portal to Web3".
 * Single wallet-mode capsule, isometric hero, headline, primary CTA that
 * cascades into the auth selector, and a log-in escape hatch.
 */
export function WelcomeScreen({
  onCreateWallet,
  onLogIn,
}: {
  onCreateWallet: () => void;
  onLogIn: () => void;
}) {
  return (
    <div className="relative flex h-full flex-col items-center px-7 pb-10 pt-14">
      {/* mode capsule */}
      <span
        className="flex h-12 items-center rounded-full border border-[#C3B1E1]/15 bg-white/[0.04] px-6 text-[13px] font-bold text-white backdrop-blur-md"
        style={{
          background: `linear-gradient(135deg, ${ONBOARD.ctaFrom}, ${ONBOARD.ctaTo})`,
          boxShadow:
            "0 6px 20px -6px rgba(124,58,237,0.8), inset 0 1px 0 rgba(255,255,255,0.25)",
        }}
      >
        Wallet
      </span>

      {/* hero illustration */}
      <div className="mt-8 flex min-h-0 flex-1 items-center justify-center">
        <div className="aspect-square w-full max-w-[330px]">
          <HandGlobeHero />
        </div>
      </div>

      {/* typography block */}
      <div className="mt-6 text-center">
        <h1 className="font-display text-[32px] font-bold leading-[1.12] tracking-tight text-white">
          Your portal to{" "}
          <span
            className="text-transparent"
            style={{
              backgroundImage: `linear-gradient(95deg, ${ONBOARD.lavenderBright}, ${ONBOARD.ctaTo})`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
            }}
          >
            Web3
          </span>
        </h1>
        <p
          className="mx-auto mt-3 max-w-[300px] text-[14px] font-medium leading-relaxed"
          style={{ color: ONBOARD.subtext }}
        >
          Step into the future of group expenses with seamless, automated
          bill-splitting pools.
        </p>
      </div>

      {/* primary actions */}
      <div className="mt-8 w-full">
        <GradientButton onClick={onCreateWallet} ariaLabel="Create wallet">
          Create wallet
        </GradientButton>
        <p className="mt-5 text-center text-[13px] font-medium" style={{ color: ONBOARD.subtext }}>
          Already have an account?{" "}
          <button
            type="button"
            onClick={onLogIn}
            className="font-bold text-white underline-offset-4 transition hover:underline active:scale-[0.98]"
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
