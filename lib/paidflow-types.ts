/**
 * Shared Paidflow settlement types for the Barkada-Split USDC layer.
 *
 * This module is intentionally free of server-only imports so both the
 * server-side settlement service and the browser client can depend on it.
 * All monetary values cross the wire as decimal strings with up to 6
 * fractional digits (native ERC-20/SPL USDC format); convert with
 * `toMicro`/`fromMicro` from `@/lib/usdc` and never use floating point.
 */

export const PAIDFLOW_CURRENCY = "USDC" as const;
export type PaidflowCurrency = typeof PAIDFLOW_CURRENCY;

/** Wallet families the address book can link to a user. */
export type UsdcNetwork = "evm" | "solana" | "stellar-testnet";

/** One member's share of a registered expense. */
export type MemberAllocation = {
  member: string;
  /** Linked wallet address for this member, if onboarded. */
  address: string | null;
  /** Decimal USDC string with up to 6 decimals, e.g. "33.333333". */
  microAmount: string;
};

/** Server-side billing configuration for the settlement layer. */
export type PaidflowBillingConfig = {
  deploymentId: string;
  scheme: "usdc-billing-intent-v1";
  treasuryMode: "creditor-wallet" | "shared-pool";
};

/** A registered cryptographic billing intent between two members. */
export type BillingIntent = {
  intentId: string;
  groupId: string;
  label: string;
  currency: PaidflowCurrency;
  debtor: string;
  creditor: string;
  /** Decimal USDC string with up to 6 decimals. */
  microAmount: string;
  treasuryAddress: string;
  status: "open" | "settled" | "expired";
  /** App-relative payment link wrapper (never contains credentials). */
  paymentUrl: string;
  createdAt: string;
  settledTxHash?: string;
};

/** Result of registering billing intents for a new expense. */
export type BillingRegistration = {
  groupId: string;
  label: string;
  currency: PaidflowCurrency;
  totalMicro: string;
  allocations: MemberAllocation[];
  intents: BillingIntent[];
};

/** Server-prepared settlement awaiting the debtor's wallet signature. */
export type SettlementPreparation = {
  preparationId: string;
  groupId: string;
  /** `${baseUrl}/${deploymentId}` of the Paiflow deployment that prepared this. */
  scope: string;
  from: string;
  to: string;
  microAmount: string;
  currency: PaidflowCurrency;
  network: "testnet" | "mainnet";
  networkPassphrase: string;
  expiresAt: string;
  xdr: string;
  txHash: string;
  status: "awaiting_signature";
};

/** The exact signed envelope has been accepted for submission. */
export type SettlementSubmission = {
  preparationId: string;
  txHash: string;
  status: "submitted";
};

/** Status of a submitted settlement as reported by the rail. */
export type SettlementConfirmation = {
  txHash: string;
  status: "confirmed" | "pending" | "not_found";
  confirmedAt?: string;
  block?: number;
};

/** Running USDC balance tracker for a group's pooled treasury. */
export type UsdcBalanceTracker = {
  groupId: string;
  currency: PaidflowCurrency;
  outstandingMicro: string;
  settledMicro: string;
  treasuryAddress: string;
  updatedAt: string;
};

/** User schema for the server-side settlement address book. */
export type PaidflowUserSchema = {
  handle: string;
  displayName: string;
  walletAddress: string | null;
  network: UsdcNetwork | null;
};

/** Mock Paidflow notification webhook delivery receipt (Nudge action). */
export type NudgeReceipt = {
  reference: string;
  groupId: string;
  member: string;
  channel: "paidflow-webhook";
  paymentUrl: string;
  deliveredAt: string;
  message: string;
};

export type SettlementErrorCode =
  | "VALIDATION"
  | "NOT_CONFIGURED"
  | "NO_OPEN_INTENT"
  | "PREPARATION_NOT_FOUND"
  | "PREPARATION_EXPIRED"
  | "ALREADY_SUBMITTED"
  | "UNRESOLVED";

/**
 * Typed failure from the settlement layer. Carries a machine-readable code
 * so API routes can map to the right HTTP status and the UI can branch
 * (e.g. the graceful NOT_CONFIGURED fallback state).
 */
export class SettlementError extends Error {
  readonly code: SettlementErrorCode;

  constructor(code: SettlementErrorCode, message: string) {
    super(message);
    this.name = "SettlementError";
    this.code = code;
  }
}

export type ApiOk<T> = { data: T };
export type ApiError = { error: { code: string; message: string } };
