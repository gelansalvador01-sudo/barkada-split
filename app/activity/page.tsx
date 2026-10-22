import type { Metadata } from "next";
import { ActivityView } from "@/components/activity-view";

export const metadata: Metadata = {
  title: "Activity — Barkada-Split",
  description: "Timeline of splits, settlements, and nudges.",
};

export default function Page() {
  return <ActivityView />;
}
