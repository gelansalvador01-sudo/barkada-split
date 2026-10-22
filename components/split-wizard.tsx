"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addExpense, useGroups } from "@/lib/barkada-store";
import { formatUsdc, fromMicro, splitEvenlyMicro, toMicro } from "@/lib/usdc";
import { createBillingIntents } from "@/lib/paidflow-client";
import { flashToast } from "@/lib/toast-bus";
import { Screen } from "@/components/bs-screen";
import {
  BoltIcon,
  CheckIcon,
  ChevronLeftIcon,
  PlusIcon,
  ReceiptIcon,
  XIcon,
} from "@/components/bs-icons";

type PressHandler = (event: MouseEvent<HTMLButtonElement>) => void;

type Item = { label: string; amount: string };

type WizardStep = 1 | 2 | 3;

const STEP_LABELS = ["Details", "Itemize", "Review"];

export function SplitWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groups = useGroups();

  const [step, setStep] = useState<WizardStep>(1);
  const [name, setName] = useState(searchParams.get("merchant") ?? "");
  const [groupId, setGroupId] = useState(searchParams.get("groupId") ?? "");
  const [paidBy, setPaidBy] = useState("You");
  const [total, setTotal] = useState(searchParams.get("total") ?? "");
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const group = groups.find((g) => g.id === groupId);
  const members = group ? ["You", ...group.people] : ["You"];

  const parsedTotal = (() => {
    try {
      return total.trim() ? toMicro(total) : null;
    } catch {
      return null;
    }
  })();

  const itemMicro = items.map((item) => {
    try {
      return item.amount.trim() ? toMicro(item.amount) : null;
    } catch {
      return null;
    }
  });
  const itemsValid =
    items.length > 0 &&
    items.every((item, i) => item.label.trim() && itemMicro[i] !== null);
  const itemsSum = itemsValid
    ? itemMicro.reduce<bigint>((acc, c) => acc + (c ?? 0n), 0n)
    : null;
  const variance =
    parsedTotal !== null && itemsSum !== null ? itemsSum - parsedTotal : null;

  const shares =
    parsedTotal !== null && parsedTotal > 0n
      ? splitEvenlyMicro(parsedTotal, members.length)
      : null;

  function fail(message: string): void {
    setError(message);
  }

  function nextFromDetails(): void {
    if (!name.trim()) return fail("Give this expense a name ✏️");
    if (!group) return fail("Pick a barkada to attach it to 👥");
    setError("");
    setStep(2);
  }

  function nextFromItemize(): void {
    if (parsedTotal === null || parsedTotal <= 0n)
      return fail("Enter a valid total amount");
    if (items.length > 0) {
      if (!itemsValid) return fail("Every item needs a label and a valid amount");
      if (variance !== 0n)
        return fail(
          `Items add up to ${formatUsdc(itemsSum ?? 0n)} — adjust them to match the total`,
        );
    }
    setError("");
    setStep(3);
  }

  function addItem(): void {
    setItems((cur) => [...cur, { label: "", amount: "" }]);
  }

  function updateItem(index: number, patch: Partial<Item>): void {
    setItems((cur) => cur.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number): void {
    setItems((cur) => cur.filter((_, i) => i !== index));
  }

  const createSplit: PressHandler = () => {
    if (!group || parsedTotal === null || busy) return;
    setBusy(true);
    const entries: Item[] =
      items.length > 0 ? items : [{ label: name.trim(), amount: total.trim() }];
    const recordEntries = (): void => {
      for (const entry of entries) {
        addExpense(group.id, {
          label: entry.label,
          amount: entry.amount.replace(/[$₱,\s]|USDC/g, ""),
          paidBy,
        });
      }
    };
    void createBillingIntents({
      groupId: group.id,
      label: name.trim(),
      paidBy,
      total: fromMicro(parsedTotal),
      members: group.people,
    })
      .then(() => {
        // Paidflow billing intents registered — now post to the ledger.
        recordEntries();
        setBusy(false);
        flashToast(`“${name.trim()}” added to ${group.name} 🎉`);
        router.push(`/groups/${group.id}`);
      })
      .catch(() => {
        // Billing-intent registration is best-effort for the local demo
        // ledger: still record the expense so the split is never lost.
        recordEntries();
        setBusy(false);
        flashToast(
          `“${name.trim()}” added to ${group.name} (Paidflow billing pending setup) 🎉`,
        );
        router.push(`/groups/${group.id}`);
      });
  };

  const inputClass =
    "mt-2 w-full rounded-2xl border border-lavender/20 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-orchid/60 focus:outline-none";

  return (
    <Screen>
      <header className="relative flex items-center gap-3 px-5 pt-5">
        <button
          type="button"
          aria-label="Back"
          onClick={() => (step === 1 ? router.push("/") : setStep((step - 1) as WizardStep))}
          className="grid size-10 place-items-center rounded-2xl border border-lavender/15 bg-white/[0.03] text-lavender transition hover:border-lavender/35 hover:bg-white/[0.08] hover:text-white active:scale-95"
        >
          <ChevronLeftIcon className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-bold">New split</h1>
          <p className="text-xs text-white/45">
            Step {step} of 3 · {STEP_LABELS[step - 1]}
          </p>
        </div>
        <span className="flex gap-1.5">
          {STEP_LABELS.map((label, i) => (
            <span
              key={label}
              aria-hidden
              className={`h-1.5 w-6 rounded-full ${
                i + 1 <= step ? "bg-gradient-to-r from-orchid to-lavender" : "bg-white/10"
              }`}
            />
          ))}
        </span>
      </header>

      {/* Step 1 — details */}
      {step === 1 && (
        <section className="px-5 pt-5">
          <div className="glass-card rounded-3xl p-4">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-lavender/60">
              Expense name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Seoul Kitchen dinner"
                className={inputClass}
              />
            </label>

            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-lavender/60">
              Attach to barkada
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={groupId === g.id}
                  onClick={() => {
                    setGroupId(g.id);
                    if (!g.people.includes(paidBy) && paidBy !== "You") setPaidBy("You");
                  }}
                  className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition hover:bg-white/10 active:scale-95 ${
                    groupId === g.id
                      ? "border-orchid/60 bg-orchid/20 text-white shadow-[0_0_12px_rgba(168,85,247,0.35)]"
                      : "border-lavender/20 bg-white/5 text-white/60"
                  }`}
                >
                  {g.emoji} {g.name}
                </button>
              ))}
            </div>

            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-lavender/60">
              Who paid?
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {members.map((member) => (
                <button
                  key={member}
                  type="button"
                  aria-pressed={paidBy === member}
                  onClick={() => setPaidBy(member)}
                  className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition hover:bg-white/10 active:scale-95 ${
                    paidBy === member
                      ? "border-mint/60 bg-mint/15 text-mint"
                      : "border-lavender/20 bg-white/5 text-white/60"
                  }`}
                >
                  {member}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={nextFromDetails}
            className="btn-settle mt-5 w-full"
          >
            Continue
          </button>
        </section>
      )}

      {/* Step 2 — itemize */}
      {step === 2 && (
        <section className="px-5 pt-5">
          <div className="glass-card rounded-3xl p-4">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-lavender/60">
              Total amount (USDC)
              <input
                inputMode="decimal"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder="0.00"
                className={`font-display text-lg font-bold ${inputClass} ${
                  parsedTotal === null && total.trim() ? "border-magenta/50" : ""
                }`}
              />
            </label>
            <p className="mt-1.5 text-xs text-white/40">
              {parsedTotal !== null
                ? `${formatUsdc(parsedTotal)} across ${members.length} people`
                : "Up to 6 decimals, e.g. 1280.50 or 0.000001"}
            </p>

            <div className="mt-5 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-lavender/60">
                Line items (optional)
              </p>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 rounded-full border border-orchid/40 bg-orchid/15 px-3 py-1.5 text-[11px] font-bold text-lavender transition hover:border-lavender/35 hover:bg-white/[0.08] hover:text-white active:scale-95"
              >
                <PlusIcon className="size-3" />
                Add item
              </button>
            </div>

            {items.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-lavender/20 px-4 py-4 text-center text-xs text-white/35">
                Skip itemizing, or add receipt lines — the sum must match the
                total.
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {items.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 rounded-2xl border border-white/5 bg-white/[0.03] p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <input
                        value={item.label}
                        onChange={(e) => updateItem(index, { label: e.target.value })}
                        placeholder={`Item ${index + 1}`}
                        className="w-full rounded-xl border border-lavender/15 bg-white/5 px-3 py-2 text-sm focus:border-orchid/60 focus:outline-none"
                      />
                      <input
                        inputMode="decimal"
                        value={item.amount}
                        onChange={(e) => updateItem(index, { amount: e.target.value })}
                        placeholder="0.00"
                        className="mt-2 w-full rounded-xl border border-lavender/15 bg-white/5 px-3 py-2 font-display text-sm font-bold focus:border-orchid/60 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove item ${index + 1}`}
                      onClick={() => removeItem(index)}
                      className="grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-white/40 transition hover:border-magenta/50 hover:text-magenta active:scale-95"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {itemsSum !== null && variance !== null && (
              <p
                role={variance === 0n ? undefined : "alert"}
                className={`mt-3 text-center text-xs font-semibold ${
                  variance === 0n ? "text-mint" : "text-magenta"
                }`}
              >
                Items: {formatUsdc(itemsSum)} ·{" "}
                {variance === 0n
                  ? "matches the total ✓"
                  : `${variance > 0n ? "+" : ""}${formatUsdc(variance < 0n ? -variance : variance)} ${variance > 0n ? "over" : "under"}`}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={nextFromItemize}
            className="btn-settle mt-5 w-full"
          >
            Review split
          </button>
        </section>
      )}

      {/* Step 3 — review */}
      {step === 3 && group && (
        <section className="px-5 pt-5">
          <div className="glass-card rounded-3xl p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-orchid to-violet-600">
                <ReceiptIcon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{name}</p>
                <p className="text-xs text-white/45">
                  {group.emoji} {group.name} · paid by {paidBy}
                </p>
              </div>
              <p className="ml-auto shrink-0 font-display text-lg font-bold">
                {formatUsdc(parsedTotal ?? 0n)}
              </p>
            </div>

            {items.length > 0 && (
              <ul className="mt-4 divide-y divide-white/5 rounded-2xl border border-white/5 bg-white/[0.03]">
                {items.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                  >
                    <span className="truncate">{item.label}</span>
                    <span className="shrink-0 font-semibold">
                      {formatUsdc(toMicro(item.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
              Each person pays
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {shares?.map((share, i) => (
                <span
                  key={members[i]}
                  className="rounded-full border border-lavender/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/75"
                >
                  {members[i]} · {formatUsdc(share)}
                </span>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={createSplit}
            disabled={busy}
            className="btn-settle mt-5 w-full disabled:opacity-60"
          >
            {busy ? (
              <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <BoltIcon />
            )}
            {busy ? "Creating split…" : "Create split"}
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/35">
            <CheckIcon className="size-3 text-mint" />
            Everyone in {group.name} sees this in their ledger instantly
          </p>
        </section>
      )}

      {error && (
        <p
          role="alert"
          className="bs-shake mx-5 mt-4 rounded-2xl border border-magenta/40 bg-magenta/10 px-4 py-3 text-center text-xs font-semibold text-magenta"
        >
          {error}
        </p>
      )}
    </Screen>
  );
}
