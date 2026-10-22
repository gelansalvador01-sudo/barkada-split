import "server-only";

import { randomBytes } from "node:crypto";
import { StrKey } from "@stellar/stellar-sdk";
import { configuration } from "@/lib/paiflow";
import { preparePayment, submitPayment, paymentStatus } from "@/lib/paiflow";
import { SettlementError } from "@/lib/paidflow-types";
import type {
  BillingIntent,
  BillingRegistration,
  MemberAllocation,
  NudgeReceipt,
  PaidflowBillingConfig,
  PaidflowUserSchema,
  SettlementConfirmation,
  SettlementPreparation,
  SettlementSubmission,
  UsdcBalanceTracker,
} from "@/lib/paidflow-types";
import { fromMicro, splitEvenlyMicro, toMicro } from "@/lib/usdc";

/* ------------------------------------------------------------------ */
/* Settlement rail — the only path to the upstream network.            */
/*                                                                     */
/* Every upstream request goes through lib/paiflow.ts and the Paiflow  */
/* SDK (per repo policy); this rail is the injectable seam that tests  */
/* cover with local fixtures. No second HTTP client is created here.   */
/* ------------------------------------------------------------------ */

export type RailPreparation = {
  xdr: string;
  network: "testnet" | "mainnet";
  networkPassphrase: string;
  expiresAt: string;
  txHash: string;
  preparationRequestId?: string;
};

export type SettlementRail = {
  prepare(input: {
    from: string;
    amountDecimal: string;
  }): Promise<RailPreparation>;
  submit(input: {
    signedXdr: string;
    preparationRequestId?: string;
  }): Promise<{ txHash: string }>;
  status(txHash: string): Promise<{ txHash: string; status: string }>;
};

/** Rail backed by the configured Paiflow deployment via lib/paiflow.ts. */
export function paiflowSdkRail(): SettlementRail {
  return {
    prepare: async ({ from, amountDecimal }) => {
      const prepared = await preparePayment(from, amountDecimal);
      return {
        xdr: prepared.xdr,
        network: prepared.network,
        networkPassphrase: prepared.networkPassphrase,
        expiresAt: prepared.expiresAt,
        txHash: prepared.txHash,
        preparationRequestId: prepared.preparationRequestId,
      };
    },
    submit: ({ signedXdr, preparationRequestId }) =>
      submitPayment(signedXdr, preparationRequestId),
    status: (txHash) => paymentStatus(txHash),
  };
}

/* ------------------------------------------------------------------ */
/* Server-side address book (users of this demo's settlement network). */
/* ------------------------------------------------------------------ */

const ALEX_TESTNET_ADDRESS = StrKey.encodeEd25519PublicKey(
  Buffer.alloc(32, 0xa1),
);

export const BARKADA_USERS: PaidflowUserSchema[] = [
  {
    handle: "alex",
    displayName: "Alex Juaneza",
    walletAddress: ALEX_TESTNET_ADDRESS,
    network: "stellar-testnet",
  },
  {
    handle: "mika",
    displayName: "Mika",
    walletAddress: StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 0xb2)),
    network: "stellar-testnet",
  },
  { handle: "jopay", displayName: "Jopay", walletAddress: null, network: null },
  { handle: "renz", displayName: "Renz", walletAddress: null, network: null },
  { handle: "bea", displayName: "Bea", walletAddress: null, network: null },
  { handle: "carlo", displayName: "Carlo", walletAddress: null, network: null },
  { handle: "denz", displayName: "Denz", walletAddress: null, network: null },
  { handle: "lara", displayName: "Lara", walletAddress: null, network: null },
  { handle: "pat", displayName: "Pat", walletAddress: null, network: null },
];

function handleFor(name: string): string {
  return name.trim().toLowerCase();
}

/* ------------------------------------------------------------------ */
/* Settlement ledger — intent registry, preparation journal, trackers. */
/* A production deployment would persist these durably; this example   */
/* keeps them process-local while preserving exact lifecycle rules.    */
/* ------------------------------------------------------------------ */

type PreparationRecord = SettlementPreparation & {
  preparationRequestId?: string;
  submittedTxHash?: string;
  submittedAt?: string;
};

export class SettlementLedger {
  private readonly intents = new Map<string, BillingIntent>();
  private readonly preparations = new Map<string, PreparationRecord>();
  private readonly trackers = new Map<string, UsdcBalanceTracker>();

  addIntents(intents: BillingIntent[]): void {
    for (const intent of intents) this.intents.set(intent.intentId, intent);
  }

  openIntentsFor(groupId: string, debtor?: string): BillingIntent[] {
    return [...this.intents.values()].filter(
      (intent) =>
        intent.groupId === groupId &&
        intent.status === "open" &&
        (debtor === undefined || intent.debtor === debtor),
    );
  }

  getIntent(intentId: string): BillingIntent | undefined {
    return this.intents.get(intentId);
  }

  markIntentsSettled(intentIds: string[], txHash: string): void {
    for (const id of intentIds) {
      const intent = this.intents.get(id);
      if (intent) {
        intent.status = "settled";
        intent.settledTxHash = txHash;
      }
    }
  }

  addPreparation(record: PreparationRecord): void {
    this.preparations.set(record.preparationId, record);
  }

  getPreparation(preparationId: string): PreparationRecord | undefined {
    return this.preparations.get(preparationId);
  }

  preparationByTxHash(txHash: string): PreparationRecord | undefined {
    return [...this.preparations.values()].find(
      (record) => record.txHash === txHash,
    );
  }

  savePreparation(record: PreparationRecord): void {
    this.preparations.set(record.preparationId, record);
  }

  saveTracker(tracker: UsdcBalanceTracker): void {
    this.trackers.set(tracker.groupId, tracker);
  }

  getTracker(groupId: string): UsdcBalanceTracker | undefined {
    return this.trackers.get(groupId);
  }
}

/* ------------------------------------------------------------------ */
/* PaidflowSettlementService                                           */
/* ------------------------------------------------------------------ */

const PREPARATION_TTL_MS = 5 * 60 * 1000;
const MAX_LABEL_LENGTH = 80;
const MAX_MEMBERS = 32;

export class PaidflowSettlementService {
  constructor(
    private readonly rail: SettlementRail,
    private readonly ledger: SettlementLedger = new SettlementLedger(),
    private readonly users: PaidflowUserSchema[] = BARKADA_USERS,
  ) {}

  /** True when the server holds a usable Paiflow deployment configuration. */
  isConfigured(): boolean {
    try {
      configuration();
      return true;
    } catch {
      return false;
    }
  }

  billingConfig(): PaidflowBillingConfig {
    let deploymentId: string;
    try {
      deploymentId = configuration().deploymentId;
    } catch {
      throw new SettlementError(
        "NOT_CONFIGURED",
        "Paidflow deployment is not configured on the server.",
      );
    }
    return {
      deploymentId,
      scheme: "usdc-billing-intent-v1",
      treasuryMode: "creditor-wallet",
    };
  }

  /** `${baseUrl}/${deploymentId}` — recovery records are namespaced by this. */
  private deploymentScope(): string {
    try {
      const c = configuration();
      return `${c.baseUrl}/${c.deploymentId}`;
    } catch {
      throw new SettlementError(
        "NOT_CONFIGURED",
        "Paidflow deployment is not configured on the server.",
      );
    }
  }

  private walletFor(name: string): string | null {
    const user = this.users.find((u) => u.handle === handleFor(name));
    return user?.walletAddress ?? null;
  }

  private treasuryFor(creditor: string): string {
    const linked = this.walletFor(creditor);
    if (linked) return linked;
    const pool = process.env.PAIDFLOW_TREASURY_ADDRESS?.trim();
    if (pool) return pool;
    return "unlinked";
  }

  /**
   * Register on-chain billing intents for an expense: every non-payer
   * member is allocated an equal 6-decimal USDC share (floor split with a
   * 1-micro remainder distribution so allocations sum exactly).
   */
  registerBillingIntents(input: {
    groupId: string;
    label: string;
    paidBy: string;
    total: string;
    members: string[];
  }): BillingRegistration {
    const groupId = input.groupId.trim();
    const label = input.label.trim();
    const paidBy = input.paidBy.trim();
    if (!/^[\w-]{1,64}$/.test(groupId))
      throw new SettlementError("VALIDATION", "Invalid group id.");
    if (!label || label.length > MAX_LABEL_LENGTH)
      throw new SettlementError("VALIDATION", "Invalid expense label.");
    const uniqueMembers = [...new Set(input.members.map((m) => m.trim()))];
    if (
      uniqueMembers.length === 0 ||
      uniqueMembers.length > MAX_MEMBERS ||
      uniqueMembers.some((m) => !m)
    )
      throw new SettlementError("VALIDATION", "Invalid member list.");
    if (paidBy !== "You" && !uniqueMembers.includes(paidBy))
      throw new SettlementError(
        "VALIDATION",
        "Payer must be You or a listed member.",
      );

    const totalMicro = toMicro(input.total);
    if (totalMicro <= 0n)
      throw new SettlementError("VALIDATION", "Amount must be positive.");

    const debtors = paidBy === "You" ? uniqueMembers : ["You"];
    const creditor = paidBy === "You" ? "You" : paidBy;
    const shares = splitEvenlyMicro(totalMicro, debtors.length);

    const createdAt = new Date().toISOString();
    const treasury = this.treasuryFor(creditor);
    const allocations: MemberAllocation[] = [];
    const intents: BillingIntent[] = [];

    debtors.forEach((member, index) => {
      const share = shares[index] ?? 0n;
      const amount = fromMicro(share);
      const intentId = `bi_${randomBytes(9).toString("hex")}`;
      allocations.push({
        member,
        address: this.walletFor(member),
        microAmount: amount,
      });
      intents.push({
        intentId,
        groupId,
        label,
        currency: "USDC",
        debtor: member,
        creditor,
        microAmount: amount,
        treasuryAddress: treasury,
        status: "open",
        paymentUrl: `/pay/${intentId}`,
        createdAt,
      });
    });

    this.ledger.addIntents(intents);
    this.refreshTracker(groupId, treasury);

    return {
      groupId,
      label,
      currency: "USDC",
      totalMicro: fromMicro(totalMicro),
      allocations,
      intents,
    };
  }

  openIntents(groupId: string): BillingIntent[] {
    return this.ledger.openIntentsFor(groupId);
  }

  /**
   * Prepare a settlement for everything "You" owe in this group: the open
   * intents are summed and the rail prepares an executable transaction for
   * the customer's own Stellar account (`from`), exactly like the proven
   * /fund flow — the envelope source must be the connected Freighter
   * address, never a server-side fixture.
   */
  async prepareSettlement(input: {
    groupId: string;
    from: string;
  }): Promise<SettlementPreparation> {
    this.billingConfig(); // fail closed when the deployment is missing
    if (!StrKey.isValidEd25519PublicKey(input.from))
      throw new SettlementError(
        "VALIDATION",
        "Supply the connected wallet's public Stellar account.",
      );
    const open = this.ledger.openIntentsFor(input.groupId, "You");
    if (open.length === 0)
      throw new SettlementError(
        "NO_OPEN_INTENT",
        "No outstanding Paidflow billing intent for this group.",
      );

    const totalMicro = open.reduce(
      (acc, intent) => acc + toMicro(intent.microAmount),
      0n,
    );
    const from = input.from;

    const first = open[0];
    const prepared = await this.rail.prepare({
      from,
      amountDecimal: fromMicro(totalMicro),
    });

    const record: PreparationRecord = {
      preparationId: `prep_${randomBytes(9).toString("hex")}`,
      groupId: input.groupId,
      scope: this.deploymentScope(),
      from,
      to: first?.treasuryAddress ?? "unlinked",
      microAmount: fromMicro(totalMicro),
      currency: "USDC",
      network: prepared.network,
      networkPassphrase: prepared.networkPassphrase,
      expiresAt:
        prepared.expiresAt ??
        new Date(Date.now() + PREPARATION_TTL_MS).toISOString(),
      xdr: prepared.xdr,
      txHash: prepared.txHash,
      status: "awaiting_signature",
      preparationRequestId: prepared.preparationRequestId,
    };
    this.ledger.addPreparation(record);
    return record;
  }

  /**
   * Submit the exact signed envelope for a preparation. Re-submitting the
   * same preparation returns the original submission — only the exact
   * recorded envelope is ever retried.
   */
  async submitSettlement(input: {
    preparationId: string;
    signedXdr: string;
  }): Promise<SettlementSubmission> {
    this.billingConfig();
    const record = this.ledger.getPreparation(input.preparationId);
    if (!record)
      throw new SettlementError(
        "PREPARATION_NOT_FOUND",
        "Unknown settlement preparation.",
      );
    if (record.submittedTxHash) {
      return {
        preparationId: record.preparationId,
        txHash: record.submittedTxHash,
        status: "submitted",
      };
    }
    if (Date.parse(record.expiresAt) <= Date.now())
      throw new SettlementError(
        "PREPARATION_EXPIRED",
        "Preparation expired. Retain the original record and check its status; expiry alone does not authorize a replacement.",
      );

    const submission = await this.rail.submit({
      signedXdr: input.signedXdr,
      preparationRequestId: record.preparationRequestId,
    });
    record.submittedTxHash = submission.txHash;
    record.submittedAt = new Date().toISOString();
    this.ledger.savePreparation(record);
    return {
      preparationId: record.preparationId,
      txHash: submission.txHash,
      status: "submitted",
    };
  }

  /** Reconcile a submitted settlement against the rail. */
  async settlementStatus(input: {
    txHash: string;
  }): Promise<SettlementConfirmation> {
    this.billingConfig();
    const record = this.ledger.preparationByTxHash(input.txHash);
    const outcome = await this.rail.status(input.txHash);
    const raw = outcome.status.toLowerCase();
    const status: SettlementConfirmation["status"] =
      raw === "success" || raw === "confirmed"
        ? "confirmed"
        : raw === "not_found"
          ? "not_found"
          : "pending";

    if (status === "confirmed" && record) {
      const open = this.ledger.openIntentsFor(record.groupId, "You");
      const settledNow = open.reduce(
        (acc, intent) => acc + toMicro(intent.microAmount),
        0n,
      );
      this.ledger.markIntentsSettled(
        open.map((intent) => intent.intentId),
        input.txHash,
      );
      this.refreshTracker(record.groupId, record.to, settledNow);
      return {
        txHash: input.txHash,
        status: "confirmed",
        confirmedAt: new Date().toISOString(),
      };
    }
    return { txHash: input.txHash, status };
  }

  /**
   * Mock Paidflow notification webhook: wrap the member's open payment
   * links into an automated messaging alert. No funds move here.
   */
  nudge(input: { groupId: string; member: string }): NudgeReceipt {
    const member = input.member.trim();
    if (!member)
      throw new SettlementError("VALIDATION", "A member is required.");
    const open = this.ledger.openIntentsFor(input.groupId, member);
    const reference = `nudge_${randomBytes(6).toString("hex")}`;
    const first = open[0];
    const paymentUrl = first
      ? first.paymentUrl
      : `/pay/${reference}`;
    const amount = open.reduce(
      (acc, intent) => acc + toMicro(intent.microAmount),
      0n,
    );
    const message = [
      `Paidflow nudge for ${member}: `,
      open.length > 0
        ? `${open.length} open billing intent${open.length === 1 ? "" : "s"} totaling ${fromMicro(amount)} USDC in ${input.groupId}.`
        : `no open billing intents in ${input.groupId} — link reserved for future requests.`,
      ` Pay via ${paymentUrl}`,
    ].join("");
    return {
      reference,
      groupId: input.groupId,
      member,
      channel: "paidflow-webhook",
      paymentUrl,
      deliveredAt: new Date().toISOString(),
      message,
    };
  }

  /** USDC balance tracker for a group's pooled treasury. */
  balanceTracker(groupId: string): UsdcBalanceTracker {
    const existing = this.ledger.getTracker(groupId);
    const open = this.ledger.openIntentsFor(groupId);
    const outstandingMicro = open.reduce(
      (acc, intent) => acc + toMicro(intent.microAmount),
      0n,
    );
    const tracker: UsdcBalanceTracker = {
      groupId,
      currency: "USDC",
      outstandingMicro: fromMicro(outstandingMicro),
      settledMicro: existing?.settledMicro ?? "0.000000",
      treasuryAddress:
        existing?.treasuryAddress ?? open[0]?.treasuryAddress ?? "unlinked",
      updatedAt: new Date().toISOString(),
    };
    this.ledger.saveTracker(tracker);
    return tracker;
  }

  private refreshTracker(
    groupId: string,
    treasury: string,
    settledDelta: bigint = 0n,
  ): void {
    const existing = this.ledger.getTracker(groupId);
    const open = this.ledger.openIntentsFor(groupId);
    const outstandingMicro = open.reduce(
      (acc, intent) => acc + toMicro(intent.microAmount),
      0n,
    );
    // Settled volume is cumulative for the group's pooled treasury even
    // when a later expense registers a different creditor wallet.
    const settledMicro = (existing ? toMicro(existing.settledMicro) : 0n) + settledDelta;
    const tracker: UsdcBalanceTracker = {
      groupId,
      currency: "USDC",
      outstandingMicro: fromMicro(outstandingMicro),
      settledMicro: fromMicro(settledMicro),
      treasuryAddress: treasury,
      updatedAt: new Date().toISOString(),
    };
    this.ledger.saveTracker(tracker);
  }
}

/* ------------------------------------------------------------------ */
/* Process-local singleton used by the API routes.                    */
/* ------------------------------------------------------------------ */

let singleton: PaidflowSettlementService | null = null;

/**
 * Demo seed: the dashboard's seeded groups carry "You owe" balances that
 * must be settleable before any new split is created through the wizard.
 * Register matching open intents (your share only) so `prepareSettlement`
 * has something to prepare. Amounts mirror `seedGroups()` in
 * lib/barkada-store.ts; keep them in sync.
 */
function seedDemoBillingIntents(service: PaidflowSettlementService): void {
  const seeds = [
    {
      groupId: "samgyup",
      label: "Samgyupsal Night — your share",
      paidBy: "Jopay",
      total: "450.00",
      members: ["Jopay", "Renz", "Bea"],
    },
    {
      groupId: "movie",
      label: "Movie Marathon — your share",
      paidBy: "Mika",
      total: "300.00",
      members: ["Mika", "Carlo"],
    },
  ];
  for (const seed of seeds) {
    try {
      service.registerBillingIntents(seed);
    } catch {
      // Seeding is best-effort demo bookkeeping; a malformed seed must not
      // block the service from starting.
    }
  }
}

export function settlementService(): PaidflowSettlementService {
  if (!singleton) {
    const service = new PaidflowSettlementService(paiflowSdkRail());
    seedDemoBillingIntents(service);
    singleton = service;
  }
  return singleton;
}

export function resetSettlementServiceForTests(): void {
  singleton = null;
}
