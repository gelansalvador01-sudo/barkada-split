"use client";

import type { ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { OnboardingGate } from "@/components/onboarding-gate";

/**
 * Shared mobile device frame: obsidian canvas, ambient violet glows,
 * the 430px app column (floating device on desktop) and the tab bar.
 * First-run visitors are gated to /onboarding before content renders.
 */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-obsidian font-sans text-white">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[430px] flex-col sm:my-8 sm:min-h-[860px] sm:rounded-[2.75rem] sm:border sm:border-lavender/15 sm:shadow-[0_0_120px_-24px_rgba(168,85,247,0.5)]">
        {/* Ambient cyberpunk glows */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-orchid/20 blur-[130px]" />
          <div className="absolute -left-28 top-1/3 h-72 w-72 rounded-full bg-lavender/10 blur-[110px]" />
          <div className="absolute -right-24 bottom-24 h-80 w-80 rounded-full bg-fuchsia-600/15 blur-[120px]" />
        </div>
        <div className="relative flex min-h-0 flex-1 flex-col">
          <OnboardingGate>{children}</OnboardingGate>
        </div>
        <AppNav />
      </div>
    </div>
  );
}
