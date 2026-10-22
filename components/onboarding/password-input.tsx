"use client";

import { useState } from "react";
import { ONBOARD } from "@/components/onboarding/primitives";
import { EyeIcon, EyeOffIcon } from "@/components/bs-icons";

const inputClass =
  "h-[52px] w-full rounded-2xl border border-[#C3B1E1]/20 bg-white/[0.05] px-4 pr-12 text-[15px] font-medium text-white placeholder:text-white/25 transition focus:border-[#BD93F9]/60 focus:bg-white/[0.07] focus:outline-none";

/**
 * Password field with a show/hide toggle so the user can check what they
 * typed before submitting. Toggles type between "password" and "text" and
 * exposes its state to assistive tech via aria-pressed.
 */
export function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  label,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  autoComplete: "current-password" | "new-password";
  label: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block" htmlFor={id}>
      <span
        className="mb-2 block text-[12px] font-bold uppercase tracking-[0.12em]"
        style={{ color: ONBOARD.subtext }}
      >
        {label}
      </span>
      <span className="relative block">
        <input
          id={id}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-white/40 transition hover:bg-white/[0.06] hover:text-white/85 active:scale-[0.98]"
        >
          {visible ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
        </button>
      </span>
    </label>
  );
}
