"use client";

import { useRouter } from "next/navigation";
import { useGroups } from "@/lib/barkada-store";
import { formatUsdc, toMicro } from "@/lib/usdc";
import { Screen } from "@/components/bs-screen";
import { CheckIcon, ChevronLeftIcon, ReceiptIcon } from "@/components/bs-icons";

type FeedEvent = {
  id: string;
  icon: "receipt" | "check";
  tone: "mint" | "lavender" | "magenta";
  text: string;
  detail: string;
  time: string;
};

export function ActivityView() {
  const router = useRouter();
  const groups = useGroups();

  // Timeline derived from the live group ledger store.
  const events: FeedEvent[] = [
    ...groups
      .filter((group) => group.settledAt)
      .map((group) => ({
        id: `settled-${group.id}`,
        icon: "check" as const,
        tone: "mint" as const,
        text: `${group.name} fully settled`,
        detail: "Balance cleared to zero",
        time: group.settledAt ?? "",
      })),
    ...groups.flatMap((group) =>
      group.history
        .slice(-4)
        .map((entry, index) => ({
          id: `${group.id}-${index}-${entry.label}`,
          icon: "receipt" as const,
          tone: (entry.paidBy === "You" ? "mint" : "lavender") as
            | "mint"
            | "lavender",
          text: `${entry.paidBy} added “${entry.label}”`,
          detail: `${group.name} · ${formatUsdc(toMicro(entry.amount))}`,
          time: group.elapsed,
        })),
    ),
  ]
    .sort((a, b) => (a.icon === b.icon ? 0 : a.icon === "check" ? -1 : 1))
    .slice(0, 14);

  const toneBubble: Record<FeedEvent["tone"], string> = {
    mint: "border-mint/30 bg-mint/10 text-mint",
    lavender: "border-lavender/30 bg-lavender/10 text-lavender",
    magenta: "border-magenta/30 bg-magenta/10 text-magenta",
  };

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
        <div>
          <h1 className="font-display text-xl font-bold">Activity</h1>
          <p className="text-xs text-white/45">
            Everything happening across your barkadas
          </p>
        </div>
      </header>

      <section className="px-5 pt-5">
        <ol className="relative space-y-3 border-l border-lavender/15 pl-5">
          {events.map((event) => (
            <li key={event.id} className="relative">
              <span
                className={`absolute -left-[27px] top-3 grid size-6 place-items-center rounded-full border bg-obsidian ${toneBubble[event.tone]}`}
              >
                {event.icon === "check" ? (
                  <CheckIcon className="size-3" />
                ) : (
                  <ReceiptIcon className="size-3" />
                )}
              </span>
              <div className="glass-card rounded-2xl px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">
                    {event.text}
                  </p>
                  <span className="shrink-0 text-[10px] font-semibold text-white/30">
                    {event.time}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-white/40">{event.detail}</p>
              </div>
            </li>
          ))}
          {events.length === 0 && (
            <p className="py-8 text-center text-sm text-white/40">
              No activity yet.
            </p>
          )}
        </ol>
      </section>
    </Screen>
  );
}
