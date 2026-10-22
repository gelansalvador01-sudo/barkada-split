import type { ReactNode } from "react";

/**
 * Onboarding design tokens — strict palette from the reference art direction:
 * midnight-indigo canvas, soft lavender 3D elements, glowing violet CTAs.
 */
export const ONBOARD = {
  canvasTop: "#05040B",
  canvasBottom: "#100C22",
  lavenderBright: "#BD93F9",
  lavenderSoft: "#C3B1E1",
  ctaFrom: "#5A2EE6",
  ctaTo: "#7C3AED",
  subtext: "#9A96B2",
} as const;

/** Wide glowing violet-gradient pill CTA with tactile press feedback. */
export function GradientButton({
  children,
  onClick,
  ariaLabel,
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="btn-onboard relative flex h-[54px] w-full items-center justify-center overflow-hidden rounded-full text-[15px] font-bold tracking-[0.01em] text-white disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        background: `linear-gradient(135deg, ${ONBOARD.ctaFrom} 0%, ${ONBOARD.ctaTo} 100%)`,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -2px 10px rgba(30,10,80,0.55), 0 12px 36px -10px rgba(124,58,237,0.75)",
      }}
    >
      {children}
    </button>
  );
}

/** Device status bar: 9:41 clock with Wi-Fi and battery glyphs. */
export function StatusBar() {
  return (
    <div className="flex items-center justify-between px-7 pt-4 text-[13px] font-semibold text-white">
      <span className="tracking-wide">9:41</span>
      <span className="flex items-center gap-1.5" aria-label="Signal, Wi-Fi and battery">
        {/* cellular bars */}
        <svg viewBox="0 0 18 12" className="h-3 w-[18px]" fill="currentColor" aria-hidden>
          <rect x="0" y="7" width="3" height="5" rx="0.8" />
          <rect x="4.5" y="5" width="3" height="7" rx="0.8" />
          <rect x="9" y="2.5" width="3" height="9.5" rx="0.8" />
          <rect x="13.5" y="0" width="3" height="12" rx="0.8" opacity="0.4" />
        </svg>
        {/* Wi-Fi */}
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden>
          <path d="M12 19h.01M8.5 15.5a5 5 0 0 1 7 0M5.5 12.2a9.4 9.4 0 0 1 13 0M2.6 8.8a13.8 13.8 0 0 1 18.8 0" />
        </svg>
        {/* battery */}
        <svg viewBox="0 0 27 13" className="h-[13px] w-[27px]" fill="none" aria-hidden>
          <rect x="0.5" y="0.5" width="22" height="12" rx="3.5" stroke="currentColor" opacity="0.45" />
          <rect x="2.5" y="2.5" width="15" height="8" rx="1.8" fill="currentColor" />
          <path d="M25 4.5v4a2.2 2.2 0 0 0 0-4Z" fill="currentColor" opacity="0.45" />
        </svg>
      </span>
    </div>
  );
}
