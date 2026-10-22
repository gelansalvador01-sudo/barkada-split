import {
  prepareSettlement,
  settlementStatus,
  submitSettlement,
} from "@/lib/paidflow-client";
import {
  connectSignerWallet,
  signSettlementPreparation,
} from "@/lib/barkada-signer";
import {
  persistSettlementPreparation,
  persistSignedEnvelope,
} from "@/lib/settlement-recovery";
import { assertOriginal } from "@/lib/transaction";
import type { SettlementConfirmation } from "@/lib/paidflow-types";

/**
 * Client-side settlement runner: the full Paidflow lifecycle for one
 * group's outstanding balance.
 *
 *   connect Freighter → prepare for the customer's own Stellar account →
 *   persist preparation → sign → verify the envelope body/hash is unchanged →
 *   persist exact signed envelope → submit → poll bounded status
 *
 * The customer private key never leaves the browser. A "pending" outcome
 * after the bounded confirmation window stays unresolved (per repo recovery
 * rules) and is returned as-is; callers must not treat it as settled.
 */

export type SettlementPhase =
  | "connecting"
  | "preparing"
  | "signing"
  | "submitting"
  | "confirming";

export type SettlementRunOptions = {
  onPhase?: (phase: SettlementPhase) => void;
  /** Bounded confirmation window: attempts and base interval (backoff ×3 max). */
  attempts?: number;
  intervalMs?: number;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollSettlementStatus(
  txHash: string,
  options: SettlementRunOptions = {},
): Promise<SettlementConfirmation> {
  const attempts = options.attempts ?? 8;
  const intervalMs = options.intervalMs ?? 2000;
  let last: SettlementConfirmation | null = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) {
      await delay(intervalMs * Math.min(attempt, 3)); // linear-ish backoff
    }
    last = await settlementStatus(txHash);
    if (last.status === "confirmed") return last;
    if (last.status === "not_found" && attempt >= 2) return last;
  }
  return last ?? { txHash, status: "pending" };
}

export async function runSettlement(
  groupId: string,
  options: SettlementRunOptions = {},
): Promise<SettlementConfirmation> {
  const { onPhase } = options;
  const on = (phase: SettlementPhase) => onPhase?.(phase);

  on("connecting");
  const address = await connectSignerWallet();

  on("preparing");
  const preparation = await prepareSettlement({ groupId, from: address });
  await persistSettlementPreparation(preparation);

  on("signing");
  const signedXdr = await signSettlementPreparation(preparation, address);
  // Refuse altered operations or fee-bump envelopes before anything is
  // persisted as submittable evidence.
  assertOriginal(preparation.xdr, signedXdr, preparation.txHash);
  await persistSignedEnvelope(
    preparation.preparationId,
    signedXdr,
    preparation.txHash,
  );

  on("submitting");
  const submission = await submitSettlement({
    preparationId: preparation.preparationId,
    signedXdr,
  });

  on("confirming");
  return pollSettlementStatus(submission.txHash, options);
}
