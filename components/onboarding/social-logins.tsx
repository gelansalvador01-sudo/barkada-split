"use client";

import { ONBOARD } from "@/components/onboarding/primitives";

/** Minimal monochrome brand glyphs for the demo social buttons. */
function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M21.35 11.1H12v2.9h5.35c-.5 2.4-2.55 3.8-5.35 3.8a5.9 5.9 0 1 1 0-11.8c1.5 0 2.85.55 3.9 1.45l2.15-2.15A8.8 8.8 0 1 0 12 20.8c5.1 0 8.55-3.6 8.55-8.65 0-.4-.05-.7-.2-1.05Z" />
    </svg>
  );
}

function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M13.5 21v-7h2.6l.5-3.2h-3.1V8.7c0-.9.3-1.6 1.7-1.6h1.5V4.2c-.3 0-1.2-.1-2.2-.1-2.3 0-3.9 1.4-3.9 4v2.7H7.8V14h2.8v7h3Z" />
    </svg>
  );
}

function PhoneGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M10.5 1.5h3A1.5 1.5 0 0 1 15 3v18a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 21V3a1.5 1.5 0 0 1 1.5-1.5ZM12 18.75h.01" />
    </svg>
  );
}

const DEMO_MESSAGE =
  "Demo button — Google, Facebook, and phone sign-in need provider credentials. Use email + password for now.";

/**
 * Demo-only social login panel: Google, Facebook, and phone-number buttons
 * rendered for the design. There is no OAuth/OTP behind them — tapping
 * explains that honestly instead of pretending to authenticate.
 */
export function SocialLoginPanel({ onDemo }: { onDemo: (message: string) => void }) {
  const options = [
    { key: "google", label: "Continue with Google", glyph: <GoogleGlyph className="size-5" /> },
    { key: "facebook", label: "Continue with Facebook", glyph: <FacebookGlyph className="size-5" /> },
    { key: "phone", label: "Continue with phone number", glyph: <PhoneGlyph className="size-5" /> },
  ] as const;

  return (
    <div className="mt-6">
      <div className="relative flex items-center" aria-hidden>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C3B1E1]/25 to-[#C3B1E1]/25" />
        <span
          className="px-3 text-[11px] font-bold uppercase tracking-[0.14em]"
          style={{ color: ONBOARD.subtext }}
        >
          or continue with
        </span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#C3B1E1]/25 to-[#C3B1E1]/25" />
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onDemo(DEMO_MESSAGE)}
            aria-label={`${option.label} (demo)`}
            className="flex h-[50px] w-full items-center gap-3 rounded-full border border-[#C3B1E1]/20 bg-white/[0.04] px-5 text-[14px] font-bold text-white/85 backdrop-blur-md transition hover:border-[#BD93F9]/45 hover:bg-white/[0.07] hover:text-white active:scale-[0.98]"
          >
            <span className="text-[#C3B1E1]">{option.glyph}</span>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
