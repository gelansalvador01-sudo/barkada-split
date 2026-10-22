import type { Metadata } from "next";
import { GroupsView } from "@/components/groups-view";

export const metadata: Metadata = {
  title: "Groups — Barkada-Split",
  description: "All your barkadas in one grid, with live balances.",
};

export default function Page() {
  return <GroupsView />;
}
