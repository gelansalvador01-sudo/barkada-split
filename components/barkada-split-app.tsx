"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  addGroup,
  settleGroup,
  totals,
  useGroups,
} from "@/lib/barkada-store";
import type { Group } from "@/lib/barkada-store";
import { useProfile } from "@/lib/profile-store";
import { toast } from "@/lib/toast-bus";
import { formatUsdc, toMicro } from "@/lib/usdc";
import { sendNudge } from "@/lib/paidflow-client";
import { runSettlement } from "@/lib/settlement-runner";
import {
  connectFreighterWallet,
  useFreighterWallet,
} from "@/lib/freighter-wallet";
import { Screen } from "@/components/bs-screen";
import { SettleButton } from "@/components/settle-button";
import { FreighterPill } from "@/components/freighter-pill";
import {
  BellIcon,
  BoltIcon,
  CameraIcon,
  CheckIcon,
  ChevronRightIcon,
  ReceiptIcon,
  XIcon,
} from "@/components/bs-icons";

/* ------------------------------------------------------------------ */
/* Event handler contracts                                             */
/* ------------------------------------------------------------------ */

type PressHandler = (event: MouseEvent<HTMLButtonElement>) => void;
type BackdropHandler = (event: MouseEvent<HTMLElement>) => void;
type CardPressHandler = (event: MouseEvent<HTMLElement>) => void;

type GroupFilter = "all" | "owe" | "owed";

type SettleAllPhase = "confirm" | "processing" | "done";
type CameraPhase = "viewfinder" | "scanning" | "result";

type Invite = { id: string; group: string; emoji: string; from: string };
type NotifLog = {
  id: string;
  title: string;
  detail: string;
  time: string;
  tone: "mint" | "magenta" | "lavender";
};

const SEED_INVITES: Invite[] = [
  { id: "inv-1", group: "Intramuros Photowalk", emoji: "📸", from: "Lara" },
  { id: "inv-2", group: "BGC Brunch Club", emoji: "🥞", from: "Pat" },
];

const SEED_LOGS: NotifLog[] = [
  {
    id: "log-1",
    title: "Mika settled $250.00 USDC",
    detail: "Movie Marathon",
    time: "18m",
    tone: "mint",
  },
  {
    id: "log-2",
    title: "Denz nudged Siargao Trip",
    detail: "3 members reminded",
    time: "1h",
    tone: "magenta",
  },
  {
    id: "log-3",
    title: "Jopay added “Unli rice ×4”",
    detail: "Samgyupsal Night · $120.00 USDC",
    time: "2h",
    tone: "lavender",
  },
  {
    id: "log-4",
    title: "New expense logged",
    detail: "Baguio Weekend · $700.00 USDC",
    time: "2d",
    tone: "lavender",
  },
];

const AVATAR_GRADIENTS = [
  "from-orchid to-fuchsia-500",
  "from-lavender to-sky-400",
  "from-violet-500 to-indigo-400",
  "from-fuchsia-400 to-rose-400",
  "from-purple-400 to-orchid",
  "from-sky-400 to-cyan-300",
];

const BATCH_STEPS = [
  "Connecting signer wallet",
  "Preparing Paidflow settlement",
  "Awaiting wallet signature",
  "Submitting to Paidflow",
  "Confirming on-chain",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function useTimers() {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer));
    },
    [],
  );
  return (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };
}

function AvatarStack({ people }: { people: string[] }) {
  const shown = people.slice(0, 3);
  const extra = people.length - shown.length;
  return (
    <div className="flex shrink-0 -space-x-2.5">
      {shown.map((person, i) => (
        <span
          key={person}
          className={`grid size-9 place-items-center rounded-full bg-gradient-to-br text-[10px] font-bold text-white ring-2 ring-obsidian ${AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]}`}
        >
          {initials(person)}
        </span>
      ))}
      {extra > 0 && (
        <span className="grid size-9 place-items-center rounded-full border border-lavender/25 bg-white/10 text-[10px] font-semibold text-lavender ring-2 ring-obsidian backdrop-blur">
          +{extra}
        </span>
      )}
    </div>
  );
}

function StatusBadge({ group }: { group: Group }) {
  if (group.status === "settled") {
    return (
      <span className="bs-badge badge-settled">
        <CheckIcon className="size-3" />
        All settled
      </span>
    );
  }
  if (group.status === "owed") {
    return (
      <span className="bs-badge badge-owed">
        You are owed {formatUsdc(toMicro(group.amount ?? "0"))}
      </span>
    );
  }
  return (
    <span className="bs-badge badge-owe">
      You owe {formatUsdc(toMicro(group.amount ?? "0"))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Overlay: receipt scanner (mock OCR)                                 */
/* ------------------------------------------------------------------ */

function CameraOverlay({
  onClose,
  onScanned,
}: {
  onClose: () => void;
  onScanned: (merchant: string, total: string) => void;
}) {
  const [phase, setPhase] = useState<CameraPhase>("viewfinder");
  const after = useTimers();

  const capture: PressHandler = () => {
    setPhase("scanning");
    after(1700, () => setPhase("result"));
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-obsidian"
      role="dialog"
      aria-modal="true"
      aria-label="Receipt scanner"
    >
      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <h2 className="font-display text-base font-bold">Receipt scanner</h2>
          <p className="text-xs text-white/45">
            {phase === "viewfinder" && "Align the receipt within the frame"}
            {phase === "scanning" && "Extracting line items…"}
            {phase === "result" && "3 line items detected"}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close scanner"
          onClick={onClose}
          className="grid size-10 place-items-center rounded-full border border-lavender/15 bg-white/5 text-white/60 transition hover:border-lavender/35 hover:bg-white/10 hover:text-white active:scale-95"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      <div className="relative mx-5 mt-6 flex-1">
        <div className="glass-card relative h-full min-h-[320px] overflow-hidden rounded-3xl">
          {/* Viewfinder corners */}
          <span aria-hidden className="absolute left-4 top-4 size-7 rounded-tl-2xl border-l-2 border-t-2 border-orchid" />
          <span aria-hidden className="absolute right-4 top-4 size-7 rounded-tr-2xl border-r-2 border-t-2 border-orchid" />
          <span aria-hidden className="absolute bottom-4 left-4 size-7 rounded-bl-2xl border-b-2 border-l-2 border-orchid" />
          <span aria-hidden className="absolute bottom-4 right-4 size-7 rounded-br-2xl border-b-2 border-r-2 border-orchid" />

          {phase === "scanning" && <div aria-hidden className="bs-scan-line" />}

          <div className="absolute inset-0 grid place-items-center">
            {phase === "viewfinder" && (
              <div className="text-center">
                <CameraIcon className="mx-auto size-10 text-lavender/50" />
                <p className="mt-3 text-xs text-white/40">
                  Demo preview — no camera access needed
                </p>
              </div>
            )}
            {phase === "scanning" && (
              <div
                role="status"
                className="flex items-center gap-2.5 rounded-full border border-orchid/30 bg-obsidian/80 px-4 py-2 text-xs font-semibold text-lavender"
              >
                <span className="size-3.5 animate-spin rounded-full border-2 border-orchid/30 border-t-orchid" />
                Reading receipt…
              </div>
            )}
            {phase === "result" && (
              <div className="mx-6 w-full max-w-[300px] rounded-2xl border border-mint/30 bg-mint/10 p-4 text-left animate-[bs-pop_.25s_ease]">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-mint">
                  OCR result
                </p>
                <p className="mt-1.5 text-sm font-semibold">Seoul Kitchen</p>
                <p className="mt-0.5 text-xs text-white/45">
                  3 items · Oct 22, 2026 · 9:41 PM
                </p>
                <p className="mt-2 font-display text-xl font-bold text-white">
                  $1,280.00 USDC
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 pb-8 pt-5">
        {phase === "viewfinder" && (
          <button
            type="button"
            onClick={capture}
            className="mx-auto grid size-16 place-items-center rounded-full border-4 border-lavender/30 bg-gradient-to-br from-orchid to-violet-600 shadow-[0_0_30px_rgba(168,85,247,0.6)] transition hover:border-lavender/60 hover:brightness-110 active:scale-95"
            aria-label="Capture receipt"
          >
            <span className="size-10 rounded-full border-2 border-white/80" />
          </button>
        )}
        {phase === "result" && (
          <button
            type="button"
            onClick={() => onScanned("Seoul Kitchen", "1280.00")}
            className="btn-settle w-full"
          >
            <ReceiptIcon className="size-4" />
            Start itemized split
          </button>
        )}
        <button
          type="button"
          onClick={() => onScanned("", "")}
          className="mt-3 w-full rounded-2xl border border-lavender/15 bg-white/5 py-3 text-sm font-semibold text-white/70 transition hover:border-lavender/40 hover:bg-white/10 hover:text-white active:scale-[0.98]"
        >
          Enter manually instead
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main screen                                                         */
/* ------------------------------------------------------------------ */

export function BarkadaSplitApp() {
  const router = useRouter();
  const groups = useGroups();
  const [profile] = useProfile();
  const freighter = useFreighterWallet();
  const { owe, owed } = totals(groups);
  const after = useTimers();

  const [filter, setFilter] = useState<GroupFilter>("all");
  const [panelOpen, setPanelOpen] = useState(false);
  const [unread, setUnread] = useState(true);
  const [invites, setInvites] = useState<Invite[]>(SEED_INVITES);
  const [logs, setLogs] = useState<NotifLog[]>(SEED_LOGS);

  const [settleAllOpen, setSettleAllOpen] = useState(false);
  const [settleAllPhase, setSettleAllPhase] = useState<SettleAllPhase>("confirm");
  const [batchTargets, setBatchTargets] = useState<Group[]>([]);
  const [batchTotal, setBatchTotal] = useState<bigint>(0n);
  const [batchStatus, setBatchStatus] = useState<
    Record<string, "active" | "confirmed" | "failed" | "pending">
  >({});

  const [cameraOpen, setCameraOpen] = useState(false);
  const [nudged, setNudged] = useState<string | null>(null);

  const firstName = profile.name.trim().split(" ")[0] || "Alex";
  const profileInitials =
    profile.name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AJ";

  const outstanding = groups.filter((group) => group.status === "owe");
  const unsettled = groups.filter((group) => group.status !== "settled").length;
  const visible = groups.filter((group) =>
    filter === "all" ? true : group.status === filter,
  );

  /* ---------------- profile & balance actions ---------------- */

  const goProfile: PressHandler = () => router.push("/profile");

  const togglePanel: PressHandler = () => {
    setPanelOpen((open) => !open);
    setUnread(false);
  };

  const markAllRead: PressHandler = () => {
    setUnread(false);
    toast("Inbox zero — everything read ✨");
  };

  const applyFilter = (next: GroupFilter) => {
    setFilter((current) => (current === next ? "all" : next));
  };

  const openSettleAll: PressHandler = () => {
    if (outstanding.length === 0) {
      toast("Nothing to settle — you're all clear 🎉");
      return;
    }
    if (freighter.status !== "connected") {
      toast("Connect Freighter to settle all ⚡");
      connectFreighterWallet().catch(() => {});
      return;
    }
    setBatchTargets(outstanding);
    setBatchTotal(owe);
    setBatchStatus({});
    setSettleAllPhase("confirm");
    setSettleAllOpen(true);
  };

  /** Settle every outstanding group through the Paidflow lifecycle. */
  const confirmSettleAll = () => {
    if (settleAllPhase !== "confirm") return;
    setSettleAllPhase("processing");
    setBatchStatus({});
    let cleared = 0n;
    void (async () => {
      for (const group of batchTargets) {
        setBatchStatus((current) => ({ ...current, [group.id]: "active" }));
        try {
          const confirmation = await runSettlement(group.id);
          if (confirmation.status === "confirmed") {
            cleared += toMicro(group.amount ?? "0");
            settleGroup(group.id);
            setBatchStatus((current) => ({
              ...current,
              [group.id]: "confirmed",
            }));
          } else {
            setBatchStatus((current) => ({ ...current, [group.id]: "pending" }));
          }
        } catch {
          setBatchStatus((current) => ({ ...current, [group.id]: "failed" }));
        }
      }
      setBatchTotal(cleared);
      setSettleAllPhase("done");
    })();
  };

  const closeSettleAll: BackdropHandler = () => {
    setSettleAllOpen(false);
    if (settleAllPhase === "done") {
      toast(`Batch payment complete — ${formatUsdc(batchTotal)} cleared ⚡`);
    }
  };

  /* ---------------- split-something-new ---------------- */

  const openCamera: PressHandler = () => setCameraOpen(true);

  const handleScanned = (merchant: string, total: string) => {
    setCameraOpen(false);
    const params = new URLSearchParams();
    if (merchant) params.set("merchant", merchant);
    if (total) params.set("total", total);
    const query = params.toString();
    router.push(`/split/new${query ? `?${query}` : ""}`);
  };

  /* ---------------- feed card actions ---------------- */

  const openGroup =
    (id: string): CardPressHandler =>
    () =>
      router.push(`/groups/${id}`);

  /** Paidflow confirmed the on-chain settlement — flip the card state. */
  const handleGroupSettled = (
    group: Group,
    confirmation: { txHash: string },
  ) => {
    settleGroup(group.id);
    toast(
      `Paidflow confirmed ${formatUsdc(toMicro(group.amount ?? "0"))} · ${group.name} settled ✅`,
    );
    void confirmation;
  };

  /** Nudge: mock Paidflow notification webhook with a payment link wrapper. */
  const nudgeGroup =
    (group: Group): PressHandler =>
    (event) => {
      event.stopPropagation();
      setNudged(group.id);
      after(2000, () => setNudged((cur) => (cur === group.id ? null : cur)));
      void sendNudge({ groupId: group.id, member: group.organizer })
        .then(() => {
          toast("Nudge sent successfully to group members!");
        })
        .catch((error: unknown) => {
          toast(
            error instanceof Error
              ? error.message
              : "Nudge could not be delivered.",
          );
        });
    };

  /* ---------------- invite actions ---------------- */

  const acceptInvite =
    (invite: Invite): PressHandler =>
    () => {
      addGroup({
        name: invite.group,
        emoji: invite.emoji,
        people: [invite.from, "Renz", "Bea"],
        organizer: invite.from,
      });
      setInvites((cur) => cur.filter((i) => i.id !== invite.id));
      toast(`You joined ${invite.group} ${invite.emoji} 🎉`);
    };

  const declineInvite =
    (invite: Invite): PressHandler =>
    () => {
      setInvites((cur) => cur.filter((i) => i.id !== invite.id));
      toast("Invite declined");
    };

  const toneDot: Record<NotifLog["tone"], string> = {
    mint: "bg-mint shadow-[0_0_8px_#6EE7B7]",
    magenta: "bg-magenta shadow-[0_0_8px_#F472B6]",
    lavender: "bg-lavender shadow-[0_0_8px_#C3B1E1]",
  };

  return (
    <Screen>
      {/* Decorative status bar */}
      <div
        aria-hidden
        className="relative flex items-center justify-between px-6 pt-4 text-[11px] font-semibold text-white/55"
      >
        <span>9:41</span>
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 16 12" className="h-2.5 w-3.5 fill-current">
            <rect x="0" y="7" width="3" height="5" rx="0.8" />
            <rect x="4.5" y="5" width="3" height="7" rx="0.8" />
            <rect x="9" y="2.5" width="3" height="9.5" rx="0.8" />
            <rect x="13" y="0" width="3" height="12" rx="0.8" />
          </svg>
          <svg viewBox="0 0 16 12" className="h-2.5 w-3.5 fill-current">
            <path d="M8 9.6a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4ZM8 6c1.9 0 3.7.73 5.07 2.05l-1.6 1.66A4.55 4.55 0 0 0 8 8.3c-1.26 0-2.4.5-3.47 1.4L2.93 8.05A7.16 7.16 0 0 1 8 6Zm0-5.25c3.42 0 6.52 1.36 8.8 3.57l-1.6 1.66A9.15 9.15 0 0 0 8 3.05c-2.53 0-4.83.99-6.2 2.93L.2 4.32A12.16 12.16 0 0 1 8 .75Z" />
          </svg>
          <svg viewBox="0 0 25 12" className="h-2.5 w-5">
            <rect x="0.5" y="0.5" width="21" height="11" rx="3" fill="none" stroke="currentColor" />
            <rect x="2.5" y="2.5" width="14" height="7" rx="1.5" className="fill-current" />
            <path d="M23.5 4v4a2.2 2.2 0 0 0 0-4Z" className="fill-current" />
          </svg>
        </div>
      </div>

      {/* 1 · Top wallet header */}
      <header className="relative px-5 pt-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goProfile}
            className="flex items-center gap-3 text-left transition-transform hover:opacity-90 active:scale-[0.97]"
            aria-label="Open profile"
          >
            <span className="relative">
              <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-orchid to-violet-600 font-display text-sm font-bold shadow-[0_0_20px_rgba(168,85,247,0.45)]">
                {profileInitials}
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-obsidian bg-mint" />
            </span>
            <span>
              <span className="block text-xs text-white/45">Good evening,</span>
              <span className="block font-display text-base font-semibold leading-tight">
                {firstName} 👋
              </span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <FreighterPill />
            <button
              type="button"
              aria-label="Notifications"
              aria-expanded={panelOpen}
              onClick={togglePanel}
              className="relative grid size-11 place-items-center rounded-2xl border border-lavender/15 bg-white/[0.03] text-lavender backdrop-blur transition hover:border-lavender/35 hover:bg-white/[0.08] hover:text-white active:scale-95"
            >
              <BellIcon className="size-5" />
              {unread && (invites.length > 0 || logs.length > 0) && (
                <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-magenta shadow-[0_0_8px_#F472B6]" />
              )}
            </button>
          </div>
        </div>

        <div className="mt-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-lavender/60">
            Total active debts
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <p className="text-gradient animate-shine font-display text-[42px] font-bold leading-none tracking-tight">
              {formatUsdc(owe)}
            </p>
            <button
              type="button"
              onClick={openSettleAll}
              disabled={outstanding.length === 0}
              className="btn-settle disabled:cursor-not-allowed disabled:opacity-40"
            >
              <BoltIcon />
              {freighter.status === "connected" ? "Settle All" : "Connect Freighter to Settle"}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={filter === "owe"}
              onClick={() => applyFilter("owe")}
              className={`chip-mini transition active:scale-95 ${
                filter === "owe"
                  ? "!border-magenta/50 !bg-magenta/15 text-white"
                  : ""
              }`}
            >
              <span className="size-1.5 rounded-full bg-magenta shadow-[0_0_8px_#F472B6]" />
              You owe {formatUsdc(owe)}
            </button>
            <button
              type="button"
              aria-pressed={filter === "owed"}
              onClick={() => applyFilter("owed")}
              className={`chip-mini transition active:scale-95 ${
                filter === "owed"
                  ? "!border-mint/50 !bg-mint/15 text-white"
                  : ""
              }`}
            >
              <span className="size-1.5 rounded-full bg-mint shadow-[0_0_8px_#6EE7B7]" />
              Owed to you {formatUsdc(owed)}
            </button>
            <button
              type="button"
              aria-pressed={filter === "all"}
              onClick={() => applyFilter("all")}
              className={`chip-mini text-white/40 transition active:scale-95 ${
                filter === "all" ? "!border-orchid/50 !bg-orchid/15 !text-white" : ""
              }`}
            >
              <span className="size-1.5 rounded-full bg-white/30" />
              {groups.length} barkadas
            </button>
          </div>
        </div>
      </header>

      {/* Split something new */}
      <section className="px-5 pt-6">
        <button
          type="button"
          onClick={openCamera}
          className="glass-card group flex w-full items-center gap-3.5 rounded-3xl p-4 text-left transition-[transform,border-color,background-color] duration-200 hover:border-orchid/50 hover:bg-white/[0.05] active:scale-[0.98]"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-orchid to-violet-600 text-white shadow-[0_0_18px_rgba(168,85,247,0.45)]">
            <ReceiptIcon className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Split something new</span>
            <span className="mt-0.5 block text-xs text-white/45">
              Scan a receipt or start from scratch
            </span>
          </span>
          <ChevronRightIcon className="size-4 shrink-0 text-lavender/60 transition-transform group-active:translate-x-0.5" />
        </button>
      </section>

      {/* 2 · Group expense feed */}
      <section className="px-5 pt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
            Active barkadas
          </h2>
          <span className="rounded-full border border-orchid/30 bg-orchid/10 px-2.5 py-1 text-[10px] font-bold tracking-wide text-lavender">
            {unsettled} UNSETTLED
          </span>
        </div>

        <div className="space-y-3">
          {visible.map((group) => (
            <article
              key={group.id}
              onClick={openGroup(group.id)}
              className={`glass-card cursor-pointer rounded-3xl p-4 transition-[transform,border-color,background-color] duration-200 hover:border-lavender/40 hover:bg-white/[0.05] active:scale-[0.98] ${
                group.status === "settled" ? "opacity-60 saturate-50" : ""
              }`}
            >
              {/* Row 1 — identity: avatars + name/total */}
              <div className="flex items-center gap-3.5">
                <AvatarStack people={group.people} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[15px] font-semibold">
                    {group.name} <span aria-hidden>{group.emoji}</span>
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-white/40">
                    {formatUsdc(toMicro(group.total))} total · {group.people.length} people · {group.elapsed}
                  </p>
                </div>
              </div>

              {/* Row 2 — status + action */}
              <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
                <StatusBadge group={group} />
                {group.status === "owed" && (
                  <button
                    type="button"
                    onClick={nudgeGroup(group)}
                    className="action-mini"
                    aria-label={`Nudge ${group.name}`}
                  >
                    <BellIcon
                      className="size-3.5 text-orchid"
                      wiggle={nudged === group.id}
                    />
                    {nudged === group.id ? "Nudged!" : "Nudge"}
                  </button>
                )}
                {group.status === "settled" && (
                  <button
                    type="button"
                    disabled
                    aria-label={`${group.name} is settled`}
                    className="grid size-8 cursor-not-allowed place-items-center rounded-full border border-mint/30 bg-mint/10 text-mint"
                  >
                    <CheckIcon className="size-4" />
                  </button>
                )}
              </div>

              {group.status === "owe" && (
                <div className="mt-3">
                  <SettleButton group={group} onSettled={handleGroupSettled} fullWidth />
                </div>
              )}
            </article>
          ))}

          {visible.length === 0 && (
            <div className="glass-card rounded-3xl p-8 text-center text-sm text-white/45">
              Nothing in this bucket — you're all clear ✨
            </div>
          )}
        </div>
      </section>

      {/* Payment demo link */}
      <div className="px-5 pt-6">
        <a
          href="/fund"
          className="glass-card flex items-center justify-between rounded-2xl px-4 py-3 text-xs text-white/50 transition hover:text-white/80"
        >
          <span className="flex items-center gap-2">
            <BoltIcon className="size-3.5 text-orchid" />
            Trip fund · Paiflow payment demo
          </span>
          <span aria-hidden>→</span>
        </a>
      </div>

      {/* Notifications dropdown panel */}
      {panelOpen &&
        createPortal(
          <div className="fixed inset-0 z-50" role="dialog" aria-label="Notifications">
            <div
              className="absolute inset-0 animate-[bs-fade_.18s_ease] bg-black/40 backdrop-blur-[2px]"
              onClick={() => setPanelOpen(false)}
            />
            <div className="glass-card absolute left-1/2 top-[max(1rem,env(safe-area-inset-top))] w-[min(92vw,400px)] -translate-x-1/2 rounded-3xl p-4 animate-[bs-pop_.22s_ease]">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold">Notifications</h2>
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[11px] font-semibold text-lavender transition hover:text-white active:scale-95"
                >
                  Mark all read
                </button>
              </div>

              {invites.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                    Pending invites
                  </p>
                  <ul className="mt-2 space-y-2">
                    {invites.map((invite) => (
                      <li
                        key={invite.id}
                        className="glass-card flex items-center gap-3 rounded-2xl p-3"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orchid/60 to-violet-600/60 text-lg">
                          {invite.emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {invite.group}
                          </p>
                          <p className="text-xs text-white/45">
                            {invite.from} invited you
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={acceptInvite(invite)}
                          className="rounded-full bg-gradient-to-r from-orchid to-violet-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:brightness-110 active:scale-95"
                        >
                          Join
                        </button>
                        <button
                          type="button"
                          aria-label={`Decline ${invite.group}`}
                          onClick={declineInvite(invite)}
                          className="grid size-7 place-items-center rounded-full border border-white/10 bg-white/5 text-white/40 transition hover:border-magenta/50 hover:text-magenta active:scale-95"
                        >
                          <XIcon className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                  Recent activity
                </p>
                <ul className="mt-2 space-y-1">
                  {logs.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-start gap-3 rounded-xl px-2 py-2 transition hover:bg-white/5"
                    >
                      <span
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${toneDot[entry.tone]}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-white/85">
                          {entry.title}
                        </p>
                        <p className="truncate text-xs text-white/40">
                          {entry.detail}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold text-white/30">
                        {entry.time}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Settle All confirmation modal */}
      {settleAllOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label="Settle all debts"
          >
            {settleAllPhase === "confirm" && (
              <div
                className="absolute inset-0 animate-[bs-fade_.2s_ease] bg-black/60 backdrop-blur-sm"
                onClick={closeSettleAll}
              />
            )}
            <div className="glass-card relative w-full max-w-[430px] rounded-t-3xl p-5 animate-[bs-sheet-up_.3s_cubic-bezier(.21,1.02,.55,1)] sm:rounded-3xl sm:animate-[bs-pop_.25s_ease]">
              {settleAllPhase === "confirm" && (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-lg font-bold">
                      Settle all debts?
                    </h2>
                    <button
                      type="button"
                      aria-label="Close"
                      onClick={closeSettleAll}
                      className="grid size-9 place-items-center rounded-full border border-lavender/15 bg-white/5 text-white/60 transition hover:border-lavender/35 hover:bg-white/10 hover:text-white active:scale-95"
                    >
                      <XIcon className="size-4" />
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-white/45">
                    Each balance settles through Paidflow: prepare, wallet
                    signature, submit, on-chain confirmation.
                  </p>
                  <ul className="mt-4 space-y-2.5">
                    {batchTargets.map((group) => (
                      <li
                        key={group.id}
                        className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3"
                      >
                        <span className="flex items-center gap-2.5">
                          <span aria-hidden>{group.emoji}</span>
                          <span>
                            <span className="block text-sm font-semibold">
                              {group.name}
                            </span>
                            <span className="block text-xs text-white/40">
                              to {group.organizer}
                            </span>
                          </span>
                        </span>
                        <span className="text-sm font-bold text-magenta">
                          {formatUsdc(toMicro(group.amount ?? "0"))}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="text-sm text-white/55">Total due</span>
                    <span className="font-display text-xl font-bold">
                      {formatUsdc(batchTotal)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={confirmSettleAll}
                    className="btn-settle mt-5 w-full"
                  >
                    <BoltIcon />
                    Confirm & pay {formatUsdc(batchTotal)}
                  </button>
                </>
              )}

              {settleAllPhase === "processing" && (
                <div className="py-2">
                  <h2 className="text-center font-display text-lg font-bold">
                    Paidflow batch settlement
                  </h2>
                  <p className="mt-1 text-center text-xs text-white/45">
                    {BATCH_STEPS.length} lifecycle stages per group · exact
                    signed envelopes only
                  </p>
                  <ul className="mt-5 space-y-3.5">
                    {batchTargets.map((group) => {
                      const status = batchStatus[group.id] ?? "queued";
                      return (
                        <li key={group.id} className="flex items-center gap-3">
                          <span
                            className={`grid size-7 shrink-0 place-items-center rounded-full border transition-colors ${
                              status === "confirmed"
                                ? "border-mint/50 bg-mint/15 text-mint"
                                : status === "active"
                                  ? "border-orchid/50 bg-orchid/15 text-lavender"
                                  : status === "failed" || status === "pending"
                                    ? "border-magenta/50 bg-magenta/15 text-magenta"
                                    : "border-white/10 bg-white/5 text-white/25"
                            }`}
                          >
                            {status === "confirmed" ? (
                              <CheckIcon className="size-3.5" />
                            ) : status === "active" ? (
                              <span className="size-3 animate-spin rounded-full border-2 border-orchid/30 border-t-orchid" />
                            ) : (
                              <span className="size-1.5 rounded-full bg-current" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block truncate text-sm ${
                                status === "confirmed"
                                  ? "text-white/85"
                                  : status === "active"
                                    ? "text-white/70"
                                    : "text-white/40"
                              }`}
                            >
                              {group.name}
                            </span>
                            <span className="block text-[11px] text-white/30">
                              {status === "confirmed"
                                ? `settled ${formatUsdc(toMicro(group.amount ?? "0"))}`
                                : status === "active"
                                  ? "settling via Paidflow…"
                                  : status === "failed"
                                    ? "failed — retain the record and retry its exact envelope"
                                    : status === "pending"
                                      ? "pending — check its original transaction"
                                      : "queued"}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {settleAllPhase === "done" && (
                <div className="py-3 text-center animate-[bs-pop_.25s_ease]">
                  <div className="mx-auto grid size-16 place-items-center rounded-full border border-mint/40 bg-mint/15 text-mint shadow-[0_0_30px_rgba(110,231,183,0.35)]">
                    <CheckIcon className="size-8" />
                  </div>
                  <h2 className="mt-4 font-display text-lg font-bold">
                    All debts cleared
                  </h2>
                  <p className="mt-1.5 text-sm text-white/55">
                    {formatUsdc(batchTotal)} settled across{" "}
                    {batchTargets.length}{" "}
                    {batchTargets.length === 1 ? "barkada" : "barkadas"}.
                    Balances reset to zero.
                  </p>
                  <button
                    type="button"
                    onClick={closeSettleAll}
                    className="btn-settle mt-5 w-full"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}

      {/* Receipt scanner overlay */}
      {cameraOpen &&
        createPortal(
          <CameraOverlay onClose={() => setCameraOpen(false)} onScanned={handleScanned} />,
          document.body,
        )}
    </Screen>
  );
}
