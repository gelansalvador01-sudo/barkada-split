"use client";

import { useRouter } from "next/navigation";
import { useGroups } from "@/lib/barkada-store";
import { formatUsdc, splitEvenlyMicro, toMicro } from "@/lib/usdc";
import { sendNudge } from "@/lib/paidflow-client";
import { toast } from "@/lib/toast-bus";
import { Screen } from "@/components/bs-screen";
import { SettleButton } from "@/components/settle-button";
import type { Group } from "@/lib/barkada-store";
import {
  BellIcon,
  CheckIcon,
  ChevronLeftIcon,
  PlusIcon,
} from "@/components/bs-icons";

export function GroupDetails({ id }: { id: string }) {
  const router = useRouter();
  const groups = useGroups();
  const group = groups.find((g) => g.id === id);

  if (!group) {
    return (
      <Screen>
        <header className="relative flex items-center gap-3 px-5 pt-5">
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.back()}
            className="grid size-10 place-items-center rounded-2xl border border-lavender/15 bg-white/[0.03] text-lavender transition hover:border-lavender/35 hover:bg-white/[0.08] hover:text-white active:scale-95"
          >
            <ChevronLeftIcon className="size-5" />
          </button>
          <h1 className="font-display text-xl font-bold">Group not found</h1>
        </header>
        <div className="px-5 pt-8 text-center text-sm text-white/45">
          This barkada may have been removed.{" "}
          <a href="/groups" className="text-lavender underline">
            Back to your groups
          </a>
        </div>
      </Screen>
    );
  }

  const members = ["You", ...group.people];
  const activeGroup = group;
  const share = splitEvenlyMicro(toMicro(group.total), members.length)[0] ?? 0n;

  /** Paidflow confirmed on-chain — flip the ledger badge. */
  function handleSettled(settled: Group) {
    toast(
      `Paidflow confirmed ${formatUsdc(toMicro(settled.amount ?? "0"))} · ${settled.name} settled ✅`,
    );
  }

  function handleNudge() {
    void sendNudge({ groupId: activeGroup.id, member: activeGroup.organizer })
      .then(() => {
        toast("Nudge sent successfully to group members!");
      })
      .catch((error: unknown) => {
        toast(
          error instanceof Error ? error.message : "Nudge could not be delivered.",
        );
      });
  }

  return (
    <Screen>
      <header className="relative flex items-center gap-3 px-5 pt-5">
        <button
          type="button"
          aria-label="Back"
          onClick={() => router.back()}
          className="grid size-10 place-items-center rounded-2xl border border-lavender/15 bg-white/[0.03] text-lavender transition hover:border-lavender/35 hover:bg-white/[0.08] hover:text-white active:scale-95"
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl font-bold">
            {group.name} <span aria-hidden>{group.emoji}</span>
          </h1>
          <p className="text-xs text-white/45">
            organized by {group.organizer} · {group.elapsed}
          </p>
        </div>
        <button
          type="button"
          aria-label="Add expense to this group"
          onClick={() => router.push(`/split/new?groupId=${group.id}`)}
          className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-orchid to-violet-600 text-white shadow-[0_0_16px_rgba(168,85,247,0.45)] transition hover:brightness-110 active:scale-95"
        >
          <PlusIcon className="size-5" />
        </button>
      </header>

      <section className="px-5 pt-5">
        <div className="glass-card rounded-3xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
            Members · {members.length}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {members.map((member) => (
              <span
                key={member}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  member === "You"
                    ? "border-orchid/40 bg-orchid/15 text-lavender"
                    : "border-lavender/20 bg-white/5 text-white/70"
                }`}
              >
                {member}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pt-3">
        {group.status === "settled" ? (
          <div className="glass-card flex items-center gap-3 rounded-3xl border-mint/25 p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full border border-mint/40 bg-mint/15 text-mint">
              <CheckIcon className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-mint">All settled</p>
              <p className="text-xs text-white/45">
                Balance cleared {group.settledAt ?? "recently"} · historical
                ledger below
              </p>
            </div>
          </div>
        ) : group.status === "owed" ? (
          <div className="glass-card flex items-center justify-between gap-3 rounded-3xl p-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-mint/70">
                You are owed
              </p>
              <p className="mt-0.5 font-display text-2xl font-bold text-mint">
                {formatUsdc(toMicro(group.amount ?? "0"))}
              </p>
            </div>
            <button type="button" onClick={handleNudge} className="action-mini">
              <BellIcon className="size-3.5 text-orchid" />
              Nudge
            </button>
          </div>
        ) : (
          <div className="glass-card flex items-center justify-between gap-3 rounded-3xl p-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-magenta/70">
                You owe
              </p>
              <p className="mt-0.5 font-display text-2xl font-bold text-magenta">
                {formatUsdc(toMicro(group.amount ?? "0"))}
              </p>
            </div>
            <SettleButton group={group} onSettled={handleSettled} />
          </div>
        )}
      </section>

      <section className="px-5 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
            Itemized ledger
          </h2>
          <span className="text-xs text-white/40">
            {formatUsdc(toMicro(group.total))} total · {formatUsdc(share)} / person
          </span>
        </div>

        <div className="glass-card divide-y divide-white/5 rounded-3xl">
          {[...group.history].reverse().map((entry, index) => (
            <div key={`${entry.label}-${index}`} className="flex items-center gap-3 px-4 py-3.5">
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-full text-[10px] font-bold ring-2 ring-obsidian ${
                  entry.paidBy === "You"
                    ? "bg-gradient-to-br from-orchid to-violet-600 text-white"
                    : "bg-gradient-to-br from-lavender to-sky-400 text-obsidian"
                }`}
              >
                {entry.paidBy === "You"
                  ? "You"
                  : entry.paidBy
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{entry.label}</p>
                <p className="text-xs text-white/40">paid by {entry.paidBy}</p>
              </div>
              <span className="shrink-0 text-sm font-bold">
                {formatUsdc(toMicro(entry.amount))}
              </span>
            </div>
          ))}
          {group.history.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-white/40">
              No expenses yet — tap + to log the first one.
            </p>
          )}
        </div>
      </section>
    </Screen>
  );
}
