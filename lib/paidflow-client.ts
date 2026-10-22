import {
  BrowserRequestError,
  browserRequest,
  RESPONSE_DEADLINE_MS,
} from "@/lib/browser-api";
import type {
  ApiError,
  ApiOk,
  BillingIntent,
  BillingRegistration,
  NudgeReceipt,
  SettlementConfirmation,
  SettlementPreparation,
  SettlementSubmission,
  UsdcBalanceTracker,
} from "@/lib/paidflow-types";

/**
 * Browser client for the Paidflow settlement API routes. Carries no
 * credentials — the server holds all Paiflow configuration. All requests
 * ride the shared browserRequest path (30s response deadline, abort), so
 * there is exactly one browser HTTP implementation in the app.
 */

export class PaidflowClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "PaidflowClientError";
    this.code = code;
    this.status = status;
  }
}

async function post<T>(url: string, body: unknown): Promise<T> {
  try {
    return await browserRequest<T>(url, body, undefined, RESPONSE_DEADLINE_MS);
  } catch (error) {
    if (error instanceof BrowserRequestError) {
      throw new PaidflowClientError(error.code, error.message, error.status);
    }
    throw error;
  }
}

// `ApiError`/`ApiOk` remain part of this module's public type surface for
// consumers that inspect raw route payloads.
export type { ApiError, ApiOk };

export function createBillingIntents(input: {
  groupId: string;
  label: string;
  paidBy: string;
  total: string;
  members: string[];
}): Promise<BillingRegistration> {
  return post<BillingRegistration>("/api/billing", { action: "create", ...input });
}

export function listBilling(groupId: string): Promise<{
  intents: BillingIntent[];
  tracker: UsdcBalanceTracker;
}> {
  return post("/api/billing", { action: "list", groupId });
}

export function prepareSettlement(input: {
  groupId: string;
  from: string;
}): Promise<SettlementPreparation> {
  return post<SettlementPreparation>("/api/settlements", {
    action: "prepare",
    ...input,
  });
}

export function submitSettlement(input: {
  preparationId: string;
  signedXdr: string;
}): Promise<SettlementSubmission> {
  return post<SettlementSubmission>("/api/settlements", {
    action: "submit",
    ...input,
  });
}

export function settlementStatus(
  txHash: string,
): Promise<SettlementConfirmation> {
  return post<SettlementConfirmation>("/api/settlements", {
    action: "status",
    txHash,
  });
}

export function sendNudge(input: {
  groupId: string;
  member: string;
}): Promise<NudgeReceipt> {
  return post<NudgeReceipt>("/api/nudge", { action: "nudge", ...input });
}
