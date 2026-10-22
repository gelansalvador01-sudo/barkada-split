"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { addGroup } from "@/lib/barkada-store";
import { bindToast, consumeFlash, toast } from "@/lib/toast-bus";
import {
  ChevronRightIcon,
  ClockIcon,
  HomeIcon,
  PlusIcon,
  ReceiptIcon,
  UserIcon,
  UsersIcon,
  XIcon,
} from "@/components/bs-icons";

type PressHandler = (event: React.MouseEvent<HTMLButtonElement>) => void;

const TABS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/groups", label: "Groups", icon: UsersIcon },
  { href: "/activity", label: "Activity", icon: ClockIcon },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

const GROUP_EMOJIS = ["🍜", "🏝️", "🎮", "🍻", "🎂", "🚗", "🏀", "🎬"];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string>(GROUP_EMOJIS[0] ?? "🍜");
  const [member, setMember] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Global toast host + one-shot flash messages from navigation.
  useEffect(() => {
    function show(message: string) {
      setToastMsg(message);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToastMsg(null), 2600);
    }
    const unbind = bindToast(show);
    const flash = consumeFlash();
    if (flash) show(flash);
    return () => {
      unbind();
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function showToast(message: string) {
    toast(message);
  }

  function go(href: string): void {
    setSheetOpen(false);
    setCreateOpen(false);
    if (pathname !== href) router.push(href);
  }

  function openSheet(): void {
    setCreateOpen(false);
    setSheetOpen(true);
  }

  function addMember(): void {
    const trimmed = member.trim();
    if (!trimmed) return;
    if (members.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`${trimmed} is already on the list`);
      return;
    }
    setMembers([...members, trimmed]);
    setMember("");
  }

  const createGroup: PressHandler = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast("Give your barkada a name first ✏️");
      return;
    }
    if (members.length === 0) {
      showToast("Add at least one member 👥");
      return;
    }
    const group = addGroup({ name: trimmed, emoji, people: members });
    showToast(`Barkada “${group.name}” created 🎉`);
    setSheetOpen(false);
    setCreateOpen(false);
    setName("");
    setMembers([]);
    setMember("");
    setEmoji(GROUP_EMOJIS[0] ?? "🍜");
  };

  const logInstant: PressHandler = () => {
    setSheetOpen(false);
    router.push("/split/new");
  };

  return (
    <>
      {/* Global toast host */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex justify-center px-6"
      >
        {toastMsg && (
          <div className="glass-card animate-[bs-pop_.24s_cubic-bezier(.21,1.02,.55,1)] flex max-w-[320px] items-center gap-2 rounded-full px-4 py-2.5 text-center text-xs font-medium shadow-2xl">
            <span className="size-1.5 shrink-0 rounded-full bg-mint shadow-[0_0_8px_#6EE7B7]" />
            {toastMsg}
          </div>
        )}
      </div>

      {/* Footer app tab bar */}
      <nav className="sticky bottom-0 z-40 mt-auto border-t border-white/5 bg-obsidian/80 px-4 pb-5 pt-2 backdrop-blur-xl">
        <div className="grid grid-cols-5 items-end">
          {TABS.slice(0, 2).map((tab) => (
            <button
              key={tab.href}
              type="button"
              onClick={() => go(tab.href)}
              aria-current={pathname === tab.href ? "page" : undefined}
              className={`relative flex min-h-[52px] flex-col items-center justify-end gap-1 pb-1 text-[10px] font-semibold transition-colors ${
                pathname === tab.href
                  ? "text-lavender"
                  : "text-white/35 hover:text-white/60"
              }`}
            >
              <tab.icon className="size-6" />
              {tab.label}
              {pathname === tab.href && (
                <span className="absolute -bottom-0.5 size-1 rounded-full bg-orchid shadow-[0_0_8px_#A855F7]" />
              )}
            </button>
          ))}
          <button
            type="button"
            aria-label="New split"
            onClick={openSheet}
            className="mx-auto grid size-13 -translate-y-3 place-items-center rounded-2xl bg-gradient-to-br from-orchid to-violet-600 text-white shadow-[0_8px_28px_rgba(168,85,247,0.55)] ring-4 ring-obsidian transition hover:brightness-110 hover:shadow-[0_10px_34px_rgba(168,85,247,0.75)] active:scale-90 active:shadow-[0_4px_16px_rgba(168,85,247,0.5)]"
          >
            <PlusIcon className="size-6" />
          </button>
          {TABS.slice(2).map((tab) => (
            <button
              key={tab.href}
              type="button"
              onClick={() => go(tab.href)}
              aria-current={pathname === tab.href ? "page" : undefined}
              className={`relative flex min-h-[52px] flex-col items-center justify-end gap-1 pb-1 text-[10px] font-semibold transition-colors ${
                pathname === tab.href
                  ? "text-lavender"
                  : "text-white/35 hover:text-white/60"
              }`}
            >
              <tab.icon className="size-6" />
              {tab.label}
              {pathname === tab.href && (
                <span className="absolute -bottom-0.5 size-1 rounded-full bg-orchid shadow-[0_0_8px_#A855F7]" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* FAB bottom-sheet portal */}
      {mounted &&
        sheetOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label="New split options"
          >
            <div
              className="absolute inset-0 animate-[bs-fade_.2s_ease] bg-black/60 backdrop-blur-sm"
              onClick={() => setSheetOpen(false)}
            />
            <div className="glass-card relative w-full max-w-[430px] rounded-t-3xl p-5 animate-[bs-sheet-up_.3s_cubic-bezier(.21,1.02,.55,1)] sm:rounded-3xl">
              {!createOpen ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-display text-lg font-bold">Start something</h2>
                      <p className="mt-1 text-xs text-white/45">
                        What are we splitting today?
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Close"
                      onClick={() => setSheetOpen(false)}
                      className="grid size-9 place-items-center rounded-full border border-lavender/15 bg-white/5 text-white/60 transition hover:border-lavender/35 hover:bg-white/10 hover:text-white active:scale-95"
                    >
                      <XIcon className="size-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="glass-card mt-4 flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-[transform,border-color,background-color] duration-200 hover:border-orchid/50 hover:bg-white/[0.05] active:scale-[0.98]"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-orchid to-violet-600 shadow-[0_0_18px_rgba(168,85,247,0.45)]">
                      <UsersIcon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        Create New Barkada Group
                      </span>
                      <span className="mt-0.5 block text-xs text-white/45">
                        Start a shared ledger with your crew
                      </span>
                    </span>
                    <ChevronRightIcon className="size-4 shrink-0 text-lavender/60" />
                  </button>

                  <button
                    type="button"
                    onClick={logInstant}
                    className="glass-card mt-3 flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-[transform,border-color,background-color] duration-200 hover:border-mint/50 hover:bg-white/[0.05] active:scale-[0.98]"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-mint to-emerald-500 text-obsidian shadow-[0_0_18px_rgba(110,231,183,0.4)]">
                      <ReceiptIcon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        New USDC Expense Split Request
                      </span>
                      <span className="mt-0.5 block text-xs text-white/45">
                        Split any bill, settled in USDC down to 6 decimals
                      </span>
                    </span>
                    <ChevronRightIcon className="size-4 shrink-0 text-lavender/60" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-lg font-bold">New barkada</h2>
                    <button
                      type="button"
                      aria-label="Back to options"
                      onClick={() => setCreateOpen(false)}
                      className="grid size-9 place-items-center rounded-full border border-lavender/15 bg-white/5 text-white/60 transition hover:border-lavender/35 hover:bg-white/10 hover:text-white active:scale-95"
                    >
                      <XIcon className="size-4" />
                    </button>
                  </div>

                  <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.18em] text-lavender/60">
                    Group name
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Friday Inuman"
                      className="mt-2 w-full rounded-2xl border border-lavender/20 bg-white/5 px-4 py-3 text-sm font-normal normal-case tracking-normal text-white placeholder:text-white/25 focus:border-orchid/60 focus:outline-none"
                    />
                  </label>

                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-lavender/60">
                    Pick an emoji
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {GROUP_EMOJIS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={emoji === option}
                        onClick={() => setEmoji(option)}
                        className={`grid size-10 place-items-center rounded-xl text-xl transition hover:bg-white/10 active:scale-90 ${
                          emoji === option
                            ? "border border-orchid/60 bg-orchid/20 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                            : "border border-white/5 bg-white/5"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>

                  <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.18em] text-lavender/60">
                    Members
                    <div className="mt-2 flex gap-2">
                      <input
                        value={member}
                        onChange={(e) => setMember(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addMember();
                          }
                        }}
                        placeholder="Type a name, then Add"
                        className="min-w-0 flex-1 rounded-2xl border border-lavender/20 bg-white/5 px-4 py-3 text-sm font-normal normal-case tracking-normal text-white placeholder:text-white/25 focus:border-orchid/60 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={addMember}
                        className="rounded-2xl border border-orchid/40 bg-orchid/15 px-4 text-sm font-semibold text-lavender transition hover:border-orchid/70 hover:bg-orchid/25 hover:text-white active:scale-95"
                      >
                        Add
                      </button>
                    </div>
                  </label>
                  {members.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {members.map((m) => (
                        <span
                          key={m}
                          className="inline-flex items-center gap-1.5 rounded-full border border-lavender/20 bg-white/5 py-1 pl-3 pr-1.5 text-xs font-medium text-white/80"
                        >
                          {m}
                          <button
                            type="button"
                            aria-label={`Remove ${m}`}
                            onClick={() =>
                              setMembers((cur) => cur.filter((x) => x !== m))
                            }
                            className="grid size-4 place-items-center rounded-full bg-white/10 text-white/50 transition hover:bg-magenta/40 hover:text-white active:scale-90"
                          >
                            <XIcon className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={createGroup}
                    className="btn-settle mt-5 w-full"
                  >
                    <UsersIcon className="size-4" />
                    Create barkada
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
