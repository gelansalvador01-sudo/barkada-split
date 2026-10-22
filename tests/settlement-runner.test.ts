import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  prepare: vi.fn(),
  sign: vi.fn(),
  persistPrep: vi.fn(),
  persistSigned: vi.fn(),
  assertOriginal: vi.fn(),
  submit: vi.fn(),
  status: vi.fn(),
}));

vi.mock("@/lib/paidflow-client", () => ({
  prepareSettlement: mocks.prepare,
  submitSettlement: mocks.submit,
  settlementStatus: mocks.status,
}));

vi.mock("@/lib/barkada-signer", () => ({
  connectSignerWallet: mocks.connect,
  signSettlementPreparation: mocks.sign,
}));

vi.mock("@/lib/settlement-recovery", () => ({
  persistSettlementPreparation: mocks.persistPrep,
  persistSignedEnvelope: mocks.persistSigned,
}));

vi.mock("@/lib/transaction", () => ({
  assertOriginal: mocks.assertOriginal,
}));

import { runSettlement } from "@/lib/settlement-runner";
import { StrKey } from "@stellar/stellar-sdk";
import type { SettlementPreparation } from "@/lib/paidflow-types";

const CUSTOMER = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 0xc3));

const PREPARATION: SettlementPreparation = {
  preparationId: "prep_test1",
  groupId: "samgyup",
  scope: "https://paiflow.test/deployment-id",
  from: CUSTOMER,
  to: "unlinked",
  microAmount: "450.000000",
  currency: "USDC",
  network: "testnet",
  networkPassphrase: "Test SDF Network ; September 2015",
  expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  xdr: "AAAA-unsigned-envelope",
  txHash: "a".repeat(64),
  status: "awaiting_signature",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.connect.mockResolvedValue(CUSTOMER);
  mocks.prepare.mockResolvedValue(PREPARATION);
  mocks.sign.mockResolvedValue("AAAA-signed-envelope");
  mocks.persistPrep.mockResolvedValue(undefined);
  mocks.persistSigned.mockResolvedValue(undefined);
  mocks.assertOriginal.mockReturnValue(undefined);
  mocks.submit.mockResolvedValue({ preparationId: "prep_test1", txHash: PREPARATION.txHash, status: "submitted" });
  mocks.status.mockResolvedValue({ txHash: PREPARATION.txHash, status: "confirmed" });
});

describe("runSettlement", () => {
  it("runs the full lifecycle in order with the customer's own address", async () => {
    const phases: string[] = [];
    const confirmation = await runSettlement("samgyup", {
      onPhase: (phase) => phases.push(phase),
    });

    expect(confirmation.status).toBe("confirmed");
    expect(phases).toEqual([
      "connecting",
      "preparing",
      "signing",
      "submitting",
      "confirming",
    ]);
    // Prepare must target the connected Freighter account.
    expect(mocks.prepare).toHaveBeenCalledWith({
      groupId: "samgyup",
      from: CUSTOMER,
    });
    expect(mocks.sign).toHaveBeenCalledWith(PREPARATION, CUSTOMER);
    // Envelope body/hash comparison happens after signing, before the
    // signed envelope is persisted or submitted.
    expect(mocks.assertOriginal).toHaveBeenCalledWith(
      PREPARATION.xdr,
      "AAAA-signed-envelope",
      PREPARATION.txHash,
    );
    const assertOrder = mocks.assertOriginal.mock.invocationCallOrder[0] ?? 0;
    expect(mocks.persistSigned.mock.invocationCallOrder[0] ?? 0).toBeGreaterThan(
      assertOrder,
    );
    expect(mocks.submit.mock.invocationCallOrder[0] ?? 0).toBeGreaterThan(
      assertOrder,
    );
    expect(mocks.submit).toHaveBeenCalledWith({
      preparationId: "prep_test1",
      signedXdr: "AAAA-signed-envelope",
    });
  });

  it("aborts before persistence and submission when the wallet alters the envelope", async () => {
    mocks.assertOriginal.mockImplementation(() => {
      throw new Error(
        "Wallet changed the original transaction body. Keep recovery evidence; do not submit.",
      );
    });
    await expect(runSettlement("samgyup")).rejects.toThrow(
      "Wallet changed the original transaction body",
    );
    expect(mocks.persistSigned).not.toHaveBeenCalled();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("propagates preparation failures without signing", async () => {
    mocks.prepare.mockRejectedValue(new Error("NOT_CONFIGURED"));
    await expect(runSettlement("samgyup")).rejects.toThrow("NOT_CONFIGURED");
    expect(mocks.sign).not.toHaveBeenCalled();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("returns a pending confirmation unresolved when the poll window ends", async () => {
    mocks.status.mockResolvedValue({ txHash: PREPARATION.txHash, status: "pending" });
    const confirmation = await runSettlement("samgyup", {
      attempts: 2,
      intervalMs: 1,
    });
    expect(confirmation.status).toBe("pending");
  });
});
