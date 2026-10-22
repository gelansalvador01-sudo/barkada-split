import type { Metadata } from "next";
import { ProfileView } from "@/components/profile-view";

export const metadata: Metadata = {
  title: "Profile — Barkada-Split",
  description: "Account parameters and notification preferences.",
};

export default function Page() {
  return <ProfileView />;
}
