import type { Metadata } from "next";
import { GroupDetails } from "@/components/group-details";

export const metadata: Metadata = {
  title: "Group ledger — Barkada-Split",
  description: "Itemized ledger, members, and settlement for one barkada.",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GroupDetails id={id} />;
}
