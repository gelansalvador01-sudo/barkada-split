"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WelcomeScreen } from "@/components/onboarding/welcome-screen";
import { AuthScreen } from "@/components/onboarding/auth-screen";
import { LoginScreen } from "@/components/onboarding/login-screen";
import { SignUpScreen } from "@/components/onboarding/signup-screen";
import { flashToast, toast } from "@/lib/toast-bus";
import { setSession } from "@/lib/auth-store";

export type OnboardingStage = "welcome" | "auth" | "login" | "signup";

/**
 * Cascading onboarding layouts: the welcome hub stays mounted beneath
 * while each next step (auth selector, log in, sign up) slides up over it,
 * so the composition reads as one continuous flow. Entering the app
 * requires a verified login or a completed sign-up, which opens the
 * session the app gate checks.
 */
export function OnboardingFlow({
  initialStage = "welcome",
}: {
  initialStage?: OnboardingStage;
}) {
  const [stage, setStage] = useState<OnboardingStage>(initialStage);
  const router = useRouter();

  const enterApp = (message: string): void => {
    setSession();
    flashToast(message);
    router.push("/");
  };

  const overlay = stage !== "welcome";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* canvas: deep midnight black into cosmic indigo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(180deg, #05040B 0%, #0A0718 55%, #100C22 100%)`,
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-[#7C3AED]/20 blur-[130px]" />
        <div className="absolute -left-24 bottom-16 h-64 w-64 rounded-full bg-[#5A2EE6]/15 blur-[110px]" />
        <div className="absolute -right-20 top-1/3 h-56 w-56 rounded-full bg-[#BD93F9]/10 blur-[100px]" />
      </div>

      {/* screen 1 — stays mounted; recedes beneath overlays */}
      <div
        className={`absolute inset-0 z-0 transition-[transform,filter,opacity] duration-500 ease-[cubic-bezier(0.21,1.02,0.55,1)] ${
          overlay ? "scale-[0.94] opacity-40 blur-[2px]" : "scale-100 opacity-100 blur-0"
        }`}
      >
        <WelcomeScreen
          onCreateWallet={() => setStage("auth")}
          onLogIn={() => setStage("login")}
        />
      </div>

      {/* screen 2 — auth selector cascades up over screen 1 */}
      {stage === "auth" && (
        <div className="absolute inset-0 z-10 animate-[bs-sheet-up_480ms_cubic-bezier(0.21,1.02,0.55,1)]">
          <AuthScreen
            onBack={() => setStage("welcome")}
            onCreateWallet={() => setStage("signup")}
            onSelectMethod={(method) =>
              toast(
                method === "keyless"
                  ? "MPC keyless onboarding is on the roadmap — Freighter signing is live today ⚡"
                  : "Hardware wallet support is coming soon — Freighter signing is live today ⚡",
              )
            }
          />
        </div>
      )}

      {/* log in — email + password verification */}
      {stage === "login" && (
        <div className="absolute inset-0 z-10 animate-[bs-sheet-up_480ms_cubic-bezier(0.21,1.02,0.55,1)]">
          <LoginScreen
            onBack={() => setStage("welcome")}
            onSignUp={() => setStage("signup")}
            onSuccess={() =>
              enterApp("Welcome back — connect your Freighter wallet to start settling ⚡")
            }
          />
        </div>
      )}

      {/* sign up — email, phone number, and password creation */}
      {stage === "signup" && (
        <div className="absolute inset-0 z-10 animate-[bs-sheet-up_480ms_cubic-bezier(0.21,1.02,0.55,1)]">
          <SignUpScreen
            onBack={() => setStage("welcome")}
            onLogIn={() => setStage("login")}
            onSuccess={() =>
              enterApp(
                "Account created — connect your Freighter wallet to start settling ⚡",
              )
            }
          />
        </div>
      )}
    </div>
  );
}
