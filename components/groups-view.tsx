"use client";

import { useRouter } from "next/navigation";
import { useGroups } from "@/lib/barkada-store";
import { formatUsdc, toMicro } from "@/lib/usdc";
import { Screen } from "@/components/bs-screen";
import { ChevronLeftIcon } from "@/components/bs-icons";

export function GroupsView() {
  const router = useRouter();
  const groups = useGroups();

  return (
    <Screen>
      <header className="relative flex items-center gap-3 px-5 pt-5">
        <button
          type="button"
          aria-label="Back"
          onClick={() => router.back()}
          className="grid size-10 place-items-center rounded-2xl border border-lavender/15 bg-white/[0.03] text-lavender backdrop-blur transition hover:border-lavender/35 hover:bg-white/[0.08] hover:text-white active:scale-95"
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold">Your barkadas</h1>
          <p className="text-xs text-white/45">
            {groups.length} groups · tap a card for its ledger
          </p>
        </div>
      </header>

      <section className="px-5 pt-5">
        <div className="grid grid-cols-2 gap-3">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => router.push(`/groups/${group.id}`)}
              className="glass-card rounded-3xl p-4 text-left transition-[transform,border-color,background-color] duration-200 hover:border-lavender/40 hover:bg-white/[0.05] active:scale-[0.96]"
            >
              <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-orchid to-violet-600 text-2xl shadow-[0_0_18px_rgba(168,85,247,0.4)]">
                {group.emoji}
              </div>
              <p className="mt-3 truncate text-sm font-semibold">
                {group.name}
              </p>
              <p className="mt-0.5 truncate text-xs text-white/40">
                {group.people.length + 1} people · {group.elapsed}
              </p>
              <div className="mt-3">
                {group.status === "settled" ? (
                  <span className="bs-badge badge-settled">All settled</span>
                ) : group.status === "owed" ? (
                  <span className="bs-badge badge-owed">
                    Owed {formatUsdc(toMicro(group.amount ?? "0"))}
                  </span>
                ) : (
                  <span className="bs-badge badge-owe">
                    Owe {formatUsdc(toMicro(group.amount ?? "0"))}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>
    </Screen>
  );
}
