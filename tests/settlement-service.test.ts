import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const configuration = vi.fn(() => ({
  deploymentId: "11111111-2222-3333-4444-555555555555",
  baseUrl: "https://paiflow.test",
  network: "testnet",
  asset: "native",
}));

vi.mock("@/lib/paiflow", () => ({
  configuration: () => configuration(),
  preparePayment: vi.fn(),
  submitPayment: vi.fn(),
  paymentStatus: vi.fn(),
}));

import {
  PaidflowSettlementService,
  SettlementLedger,
  resetSettlementServiceForTests,
  settlementService,
} from "@/lib/paidflow-settlement";
import { preparePayment } from "@/lib/paiflow";
import type { SettlementRail } from "@/lib/paidflow-settlement";
import { SettlementError } from "@/lib/paidflow-types";
import type { SettlementErrorCode } from "@/lib/paidflow-types";
import { sumMicro, toMicro } from "@/lib/usdc";
import { StrKey } from "@stellar/stellar-sdk";

/** Synthetic but well-formed testnet account standing in for the customer's Freighter. */
const CUSTOMER_ADDRESS = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 0xc3));

let txCounter = 0;

function fixtureRail(overrides: Partial<SettlementRail> = {}): SettlementRail {
  return {
    prepare: async () => ({
      xdr: "AAAA-fixture-envelope",
      network: "testnet",
      networkPassphrase: "Test SDF Network ; September 2015",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      txHash: `tx_fixture_${++txCounter}`,
      preparationRequestId: "prep-req-fixture",
    }),
    submit: async () => ({ txHash: `tx_fixture_${txCounter}` }),
    status: async (txHash: string) => ({ txHash, status: "success" }),
    ...overrides,
  };
}

let service: PaidflowSettlementService;

/** Assert a sync call fails with the expected SettlementError code. */
function expectCode(code: SettlementErrorCode, fn: () => unknown): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(SettlementError);
    expect((error as SettlementError).code).toBe(code);
    return;
  }
  throw new Error(`expected SettlementError ${code}, but nothing was thrown`);
}

beforeEach(() => {
  txCounter = 0;
  configuration.mockClear();
  configuration.mockImplementation(() => ({
    deploymentId: "11111111-2222-3333-4444-555555555555",
    baseUrl: "https://paiflow.test",
    network: "testnet",
    asset: "native",
  }));
  service = new PaidflowSettlementService(fixtureRail());
});

describe("billingConfig", () => {
  it("reports the configured deployment", () => {
    expect(service.isConfigured()).toBe(true);
    expect(service.billingConfig()).toEqual({
      deploymentId: "11111111-2222-3333-4444-555555555555",
      scheme: "usdc-billing-intent-v1",
      treasuryMode: "creditor-wallet",
    });
  });

  it("fails closed when the deployment is missing", () => {
    configuration.mockImplementation(() => {
      throw new Error("PAIFLOW_API_TOKEN is not set");
    });
    expect(service.isConfigured()).toBe(false);
    expectCode("NOT_CONFIGURED", () => service.billingConfig());
  });
});

describe("registerBillingIntents", () => {
  it("allocates exact 6-decimal USDC shares that sum back to the total", () => {
    const registration = service.registerBillingIntents({
      groupId: "samgyup",
      label: "Samgyupsal Night",
      paidBy: "You",
      total: "100.00",
      members: ["Mika", "Carlo", "Denz"],
    });
    expect(registration.currency).toBe("USDC");
    expect(registration.totalMicro).toBe("100.000000");
    expect(registration.intents).toHaveLength(3);
    expect(registration.intents.every((i) => i.status === "open")).toBe(true);
    expect(registration.intents[0]?.paymentUrl).toMatch(/^\/pay\/bi_/);
    const allocated = sumMicro(registration.allocations.map((a) => a.microAmount));
    expect(allocated).toBe(toMicro("100.00"));
  });

  it("distributes a 1-micro remainder without losing funds", () => {
    const registration = service.registerBillingIntents({
      groupId: "movie",
      label: "Movie Marathon",
      paidBy: "Mika",
      total: "100.00",
      members: ["Mika", "Carlo"],
    });
    // Only "You" owes when a member paid; the creditor's linked wallet is
    // the pooled treasury for the transfer.
    expect(registration.intents.map((i) => i.debtor)).toEqual(["You"]);
    expect(registration.intents[0]?.microAmount).toBe("100.000000");
    expect(registration.intents[0]?.creditor).toBe("Mika");
    expect(registration.intents[0]?.treasuryAddress).toMatch(/^G[A-Z2-7]{55}$/);
  });

  it("rejects malformed registrations with machine-readable codes", () => {
    const bad = (input: Parameters<typeof service.registerBillingIntents>[0]) =>
      expectCode("VALIDATION", () => service.registerBillingIntents(input));
    bad({ groupId: "bad id!", label: "x", paidBy: "You", total: "1", members: ["Mika"] });
    bad({ groupId: "g", label: "", paidBy: "You", total: "1", members: ["Mika"] });
    bad({ groupId: "g", label: "x", paidBy: "Stranger", total: "1", members: ["Mika"] });
    bad({ groupId: "g", label: "x", paidBy: "You", total: "0.00", members: ["Mika"] });
    bad({ groupId: "g", label: "x", paidBy: "You", total: "1", members: [] });
  });
});

describe("prepare → submit → confirm lifecycle", () => {
  async function preparedGroup(total = "60.00") {
    service.registerBillingIntents({
      groupId: "samgyup",
      label: "Dinner",
      paidBy: "Mika",
      total,
      members: ["Mika", "Carlo"],
    });
    return service.prepareSettlement({ groupId: "samgyup", from: CUSTOMER_ADDRESS });
  }

  it("prepares a settlement for the customer's own Stellar account", async () => {
    const preparation = await preparedGroup();
    expect(preparation.status).toBe("awaiting_signature");
    expect(preparation.from).toBe(CUSTOMER_ADDRESS);
    expect(preparation.scope).toBe(
      "https://paiflow.test/11111111-2222-3333-4444-555555555555",
    );
    expect(preparation.microAmount).toBe("60.000000");
    expect(preparation.currency).toBe("USDC");
    expect(preparation.network).toBe("testnet");
    expect(preparation.xdr).toBe("AAAA-fixture-envelope");
  });

  it("rejects a malformed customer address", async () => {
    service.registerBillingIntents({
      groupId: "samgyup",
      label: "Dinner",
      paidBy: "Mika",
      total: "60.00",
      members: ["Mika", "Carlo"],
    });
    await expect(
      service.prepareSettlement({ groupId: "samgyup", from: "not-stellar" }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("refuses to prepare with no open intent", async () => {
    await expect(
      service.prepareSettlement({ groupId: "siargao", from: CUSTOMER_ADDRESS }),
    ).rejects.toMatchObject({ code: "NO_OPEN_INTENT" });
  });

  it("submits the exact signed envelope and de-duplicates resubmission", async () => {
    const rail = fixtureRail();
    const submitSpy = vi.spyOn(rail, "submit");
    const local = new PaidflowSettlementService(rail);
    local.registerBillingIntents({
      groupId: "samgyup",
      label: "Dinner",
      paidBy: "Mika",
      total: "60.00",
      members: ["Mika", "Carlo"],
    });
    const preparation = await local.prepareSettlement({
      groupId: "samgyup",
      from: CUSTOMER_ADDRESS,
    });

    const first = await local.submitSettlement({
      preparationId: preparation.preparationId,
      signedXdr: "signed-envelope-1",
    });
    expect(first.status).toBe("submitted");
    expect(submitSpy).toHaveBeenCalledTimes(1);
    expect(submitSpy).toHaveBeenCalledWith(
      expect.objectContaining({ preparationRequestId: "prep-req-fixture" }),
    );

    const retry = await local.submitSettlement({
      preparationId: preparation.preparationId,
      signedXdr: "signed-envelope-1",
    });
    expect(retry.txHash).toBe(first.txHash);
    expect(submitSpy).toHaveBeenCalledTimes(1); // exact original only
  });

  it("rejects unknown preparations and expired ones", async () => {
    await expect(
      service.submitSettlement({ preparationId: "nope", signedXdr: "x" }),
    ).rejects.toMatchObject({ code: "PREPARATION_NOT_FOUND" });

    const rail = fixtureRail();
    const local = new PaidflowSettlementService(rail);
    local.registerBillingIntents({
      groupId: "samgyup",
      label: "Dinner",
      paidBy: "Mika",
      total: "60.00",
      members: ["Mika", "Carlo"],
    });
    const preparation = await local.prepareSettlement({
      groupId: "samgyup",
      from: CUSTOMER_ADDRESS,
    });
    const record = localLedgerRecord(local, preparation.preparationId);
    record.expiresAt = new Date(Date.now() - 1000).toISOString();
    await expect(
      local.submitSettlement({
        preparationId: preparation.preparationId,
        signedXdr: "x",
      }),
    ).rejects.toMatchObject({ code: "PREPARATION_EXPIRED" });
  });

  it("marks intents settled and accumulates the tracker on confirmation", async () => {
    const preparation = await preparedGroup("60.00");
    await service.submitSettlement({
      preparationId: preparation.preparationId,
      signedXdr: "signed-envelope-1",
    });
    const confirmation = await service.settlementStatus({
      txHash: preparation.txHash,
    });
    expect(confirmation.status).toBe("confirmed");

    let tracker = service.balanceTracker("samgyup");
    expect(tracker.settledMicro).toBe("60.000000");
    expect(tracker.outstandingMicro).toBe("0.000000");

    // A new expense reopens the outstanding side without touching settled.
    service.registerBillingIntents({
      groupId: "samgyup",
      label: "Late-night ramen",
      paidBy: "Carlo",
      total: "25.00",
      members: ["Mika", "Carlo"],
    });
    tracker = service.balanceTracker("samgyup");
    expect(tracker.outstandingMicro).toBe("25.000000");
    expect(tracker.settledMicro).toBe("60.000000");
    expect(service.openIntents("samgyup")).toHaveLength(1);
  });
});

/** Reach the ledger through the service's own public surface for expiry tests. */
function localLedgerRecord(
  service: PaidflowSettlementService,
  preparationId: string,
): { expiresAt: string } {
  const ledger = (service as unknown as { ledger: SettlementLedger }).ledger;
  const record = ledger.getPreparation(preparationId);
  if (!record) throw new Error("missing preparation");
  return record;
}

describe("nudge", () => {
  it("wraps open payment links into a webhook receipt", () => {
    service.registerBillingIntents({
      groupId: "siargao",
      label: "Island hopping",
      paidBy: "You",
      total: "120.00",
      members: ["Mika", "Denz"],
    });
    const receipt = service.nudge({ groupId: "siargao", member: "Mika" });
    expect(receipt.reference).toMatch(/^nudge_/);
    expect(receipt.channel).toBe("paidflow-webhook");
    expect(receipt.groupId).toBe("siargao");
    expect(receipt.member).toBe("Mika");
    expect(receipt.paymentUrl).toMatch(/^\/pay\/bi_/);
    expect(receipt.message).toContain("60.000000 USDC");
    expect(receipt.message).toContain(receipt.paymentUrl);
  });

  it("reserves a link when the member has no open intents", () => {
    const receipt = service.nudge({ groupId: "siargao", member: "Lara" });
    expect(receipt.paymentUrl).toBe(`/pay/${receipt.reference}`);
  });

  it("requires a member", () => {
    expect(() => service.nudge({ groupId: "siargao", member: "  " })).toThrow(
      SettlementError,
    );
  });
});

describe("demo seed (settlementService singleton)", () => {
  afterEach(() => {
    resetSettlementServiceForTests();
  });

  it("seeds open intents matching the seeded owe groups on first use", async () => {
    vi.mocked(preparePayment).mockResolvedValue({
      xdr: "AAAA-seed-envelope",
      network: "testnet",
      networkPassphrase: "Test SDF Network ; September 2015",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      txHash: "b".repeat(64),
      amountStroops: "1",
      preparationRequestId: "prep-req-seed",
    });

    const seeded = settlementService();

    const samgyup = seeded.openIntents("samgyup");
    expect(samgyup).toHaveLength(1);
    expect(samgyup[0]?.debtor).toBe("You");
    expect(samgyup[0]?.creditor).toBe("Jopay");
    expect(samgyup[0]?.microAmount).toBe("450.000000");

    const movie = seeded.openIntents("movie");
    expect(movie).toHaveLength(1);
    expect(movie[0]?.microAmount).toBe("300.000000");

    // Seeded groups are immediately settleable without a wizard split.
    const preparation = await seeded.prepareSettlement({
      groupId: "movie",
      from: CUSTOMER_ADDRESS,
    });
    expect(preparation.microAmount).toBe("300.000000");

    // Groups without a seeded balance still fail closed.
    await expect(
      seeded.prepareSettlement({ groupId: "siargao", from: CUSTOMER_ADDRESS }),
    ).rejects.toMatchObject({ code: "NO_OPEN_INTENT" });
  });
});
