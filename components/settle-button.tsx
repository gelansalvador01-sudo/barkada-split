"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import { PaidflowClientError } from "@/lib/paidflow-client";
import { runSettlement } from "@/lib/settlement-runner";
import type { SettlementPhase } from "@/lib/settlement-runner";
import {
  connectFreighterWallet,
  useFreighterWallet,
} from "@/lib/freighter-wallet";
import { formatUsdc, toMicro } from "@/lib/usdc";
import { toast } from "@/lib/toast-bus";
import type { Group } from "@/lib/barkada-store";
import type { SettlementConfirmation } from "@/lib/paidflow-types";
import { BoltIcon, WalletIcon } from "@/components/bs-icons";

export type SettleButtonProps = {
  group: Group;
  /** Called only after Paidflow confirms the on-chain settlement. */
  onSettled: (group: Group, confirmation: SettlementConfirmation) => void;
  /** Stretch to the full container width (dashboard card action row). */
  fullWidth?: boolean;
};

type SettlePhase =
  | "idle"
  | SettlementPhase
  | "unconfigured";

const PHASE_LABEL: Record<Exclude<SettlePhase, "idle" | "unconfigured">, string> = {
  connecting: "Connecting Freighter…",
  preparing: "Preparing…",
  signing: "Awaiting Freighter signature…",
  submitting: "Submitting…",
  confirming: "Confirming on-chain…",
};

/**
 * Paidflow-powered settle button.
 *
 *  - Freighter not linked     -> "Connect Freighter to Settle" (connects on tap)
 *  - Idle                     -> "Settle"
 *  - Executing                -> lavender spinner inside the button
 *  - Confirmed (via onSettled) -> parent flips the badge to "All settled"
 *  - Server not configured    -> honest "Setup Paidflow" state (no fake success)
 */
export function SettleButton({ group, onSettled, fullWidth = false }: SettleButtonProps) {
  const wallet = useFreighterWallet();
  const [phase, setPhase] = useState<SettlePhase>("idle");
  const width = fullWidth ? " w-full justify-center" : "";

  if (wallet.status !== "connected") {
    const handleConnect: (event: MouseEvent<HTMLButtonElement>) => void = (event) => {
      event.stopPropagation();
      connectFreighterWallet().catch((error: unknown) => {
        toast(
          error instanceof Error
            ? error.message
            : "Freighter connection failed.",
        );
      });
    };
    return (
      <button
        type="button"
        onClick={handleConnect}
        className={`action-mini settle${width}`}
        aria-label={`Connect Freighter to settle ${group.name}`}
      >
        <WalletIcon className="size-3.5 text-orchid" />
        Connect Freighter to Settle
      </button>
    );
  }

  if (phase === "unconfigured") {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          toast(
            "Paidflow deployment not configured — add the server-side Paiflow credentials and restart, then retry.",
          );
        }}
        className={`action-mini settle${width}`}
        title="Paidflow deployment is not configured on the server"
        aria-label={`Paidflow not configured for ${group.name}`}
      >
        <BoltIcon className="size-3 text-amber-300" />
        Setup Paidflow
      </button>
    );
  }

  if (phase !== "idle") {
    return (
      <span
        role="status"
        className={`action-mini settle cursor-wait opacity-90${width}`}
        aria-label={`Settling ${group.name}`}
      >
        <span className="size-3 animate-spin rounded-full border-2 border-lavender/30 border-t-lavender" />
        {PHASE_LABEL[phase]}
      </span>
    );
  }

  const handleSettle: (event: MouseEvent<HTMLButtonElement>) => void = (event) => {
    event.stopPropagation();
    if (!group.amount) return;
    setPhase("connecting");
    void runSettlement(group.id, { onPhase: setPhase })
      .then((confirmation) => {
        if (confirmation.status === "confirmed") {
          setPhase("idle");
          onSettled(group, confirmation);
          return;
        }
        setPhase("idle");
        toast(
          "Settlement pending — retain the record and check its status; nothing was double-paid.",
        );
      })
      .catch((error: unknown) => {
        if (error instanceof PaidflowClientError && error.code === "NOT_CONFIGURED") {
          setPhase("unconfigured");
          return;
        }
        setPhase("idle");
        toast(
          error instanceof Error
            ? error.message
            : "Settlement could not complete. Check the original record before retrying.",
        );
      });
  };

  return (
    <button
      type="button"
      onClick={handleSettle}
      className={`action-mini settle${width}`}
      aria-label={`Settle ${group.name}`}
      title={group.amount ? `Settle ${formatUsdc(toMicro(group.amount))} via Paidflow` : undefined}
    >
      <BoltIcon className="size-3 text-orchid" />
      Settle
    </button>
  );
}
