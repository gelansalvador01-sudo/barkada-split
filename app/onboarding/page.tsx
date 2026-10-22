import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import type { OnboardingStage } from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = {
  title: "Barkada-Split — Your portal to Web3",
  description:
    "Create a wallet and step into the future of group expenses with seamless, automated bill-splitting pools.",
};

const STAGES: readonly OnboardingStage[] = ["welcome", "auth", "login", "signup"];

/**
 * Standalone onboarding canvas: floating device frame without the tab bar.
 * `?stage=` opens directly at a chosen step — the app gate uses it to land
 * returning visitors on "login" and "Create another account" on "signup".
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const { stage } = await searchParams;
  const initialStage: OnboardingStage = STAGES.includes(
    stage as OnboardingStage,
  )
    ? (stage as OnboardingStage)
    : "welcome";
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#05040B] font-sans text-white">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[430px] flex-col sm:my-8 sm:min-h-[860px] sm:rounded-[2.75rem] sm:border sm:border-[#BD93F9]/15 sm:shadow-[0_0_120px_-24px_rgba(124,58,237,0.55)]">
        <OnboardingFlow initialStage={initialStage} />
      </div>
    </div>
  );
}
