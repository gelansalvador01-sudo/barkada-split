import { Suspense } from "react";
import type { Metadata } from "next";
import { SplitWizard } from "@/components/split-wizard";

export const metadata: Metadata = {
  title: "New split — Barkada-Split",
  description: "Create an itemized expense split for your barkada.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-obsidian" />}>
      <SplitWizard />
    </Suspense>
  );
}
