"use client";

import { assertOriginal, envelopeHash } from "@/lib/transaction";
import { TESTNET } from "@/lib/types";
import type { SettlementPreparation } from "@/lib/paidflow-types";

/**
 * Browser-side settlement evidence store, aligned with the discipline of
 * lib/recovery.ts: records are versioned, scoped to the configured
 * Paiflow deployment, bound to the consenting Stellar address, and
 * validated on every read (stored envelope hash must match the recorded
 * transaction hash; a stored signed envelope must be the exact original
 * body). The preparation is persisted BEFORE signing and the exact signed
 * envelope BEFORE submission; a storage failure aborts the financial step
 * (fail closed). Records are never logged. Web Locks serialize
 * read/modify/write cycles when the platform supports them.
 */

const KEY_PREFIX = "barkada-split:settlement-recovery:v2:";
const LOCK_NAME = "barkada-split:settlement-recovery";

export type SettlementRecoveryRecord = {
  version: 2;
  /** `${baseUrl}/${deploymentId}` of the Paiflow deployment that prepared this. */
  scope: string;
  /** Stellar G… address of the consenting Freighter account. */
  address: string;
  preparation: SettlementPreparation;
  signedEnvelope?: { signedXdr: string; txHash: string; savedAt: string };
  updatedAt: string;
};

async function withRecoveryLock<T>(action: () => Promise<T>): Promise<T> {
  const locks = (
    globalThis as {
      navigator?: { locks?: { request(name: string, callback: () => Promise<T>): Promise<T> } };
    }
  ).navigator?.locks;
  if (!locks) return action(); // Web Locks unavailable — proceed without.
  return locks.request(LOCK_NAME, action);
}

function storage(): Storage {
  if (typeof window === "undefined" || !window.localStorage) {
    throw new Error("Settlement evidence storage is unavailable in this context.");
  }
  return window.localStorage;
}

function failClosed(message: string): never {
  throw new Error(
    `${message} Keep the original payment record and check its status before starting another settlement.`,
  );
}

function keyForScope(scope: string): string {
  return `${KEY_PREFIX}${scope}`;
}

function isValidPreparation(p: unknown): p is SettlementPreparation {
  if (!p || typeof p !== "object") return false;
  const v = p as Record<string, unknown>;
  if (
    typeof v.preparationId !== "string" ||
    typeof v.groupId !== "string" ||
    typeof v.from !== "string" ||
    typeof v.xdr !== "string" ||
    typeof v.txHash !== "string" ||
    typeof v.expiresAt !== "string" ||
    typeof v.networkPassphrase !== "string" ||
    v.network !== "testnet" ||
    v.networkPassphrase !== TESTNET ||
    !Number.isFinite(Date.parse(v.expiresAt)) ||
    !/^[a-f0-9]{64}$/.test(v.txHash)
  ) {
    return false;
  }
  try {
    return envelopeHash(v.xdr) === v.txHash;
  } catch {
    return false;
  }
}

/** Strict read-path validation; a corrupt record must never be trusted. */
export function readSettlementRecord(
  scope: string,
  raw: string,
): SettlementRecoveryRecord {
  let r: SettlementRecoveryRecord;
  try {
    r = JSON.parse(raw) as SettlementRecoveryRecord;
  } catch {
    failClosed("Stored settlement record is unreadable.");
  }
  if (
    !r ||
    r.version !== 2 ||
    r.scope !== scope ||
    typeof r.address !== "string" ||
    !/^G[A-Z2-7]{55}$/.test(r.address) ||
    !isValidPreparation(r.preparation)
  ) {
    failClosed("Stored settlement record failed integrity checks.");
  }
  if (r.signedEnvelope !== undefined) {
    if (
      typeof r.signedEnvelope.signedXdr !== "string" ||
      r.signedEnvelope.txHash !== r.preparation.txHash
    ) {
      failClosed("Stored signed envelope failed integrity checks.");
    }
    try {
      assertOriginal(
        r.preparation.xdr,
        r.signedEnvelope.signedXdr,
        r.preparation.txHash,
      );
    } catch {
      failClosed("Stored signed envelope no longer matches the preparation.");
    }
  }
  return r;
}

function readRecord(store: Storage, scope: string): SettlementRecoveryRecord | null {
  let raw: string | null;
  try {
    raw = store.getItem(keyForScope(scope));
  } catch {
    return null;
  }
  if (!raw) return null;
  return readSettlementRecord(scope, raw);
}

export async function persistSettlementPreparation(
  preparation: SettlementPreparation,
): Promise<void> {
  await withRecoveryLock(async () => {
    let store: Storage;
    try {
      store = storage();
    } catch (error) {
      failClosed(error instanceof Error ? error.message : "Storage unavailable.");
    }
    const scope = preparation.scope;
    const existing = readRecord(store, scope);
    const record: SettlementRecoveryRecord = {
      version: 2,
      scope,
      address: preparation.from,
      preparation,
      // Preserve a previously saved signed envelope for the same hash only.
      signedEnvelope:
        existing?.signedEnvelope?.txHash === preparation.txHash
          ? existing.signedEnvelope
          : undefined,
      updatedAt: new Date().toISOString(),
    };
    const raw = JSON.stringify(record);
    // Fail closed unless the record round-trips its own validation.
    readSettlementRecord(scope, raw);
    try {
      store.setItem(keyForScope(scope), raw);
    } catch {
      failClosed("Settlement preparation could not be persisted.");
    }
  });
}

export async function persistSignedEnvelope(
  preparationId: string,
  signedXdr: string,
  txHash: string,
): Promise<void> {
  await withRecoveryLock(async () => {
    let store: Storage;
    try {
      store = storage();
    } catch (error) {
      failClosed(error instanceof Error ? error.message : "Storage unavailable.");
    }
    // The caller must re-read via the preparation's scope; the exact
    // envelope is only ever attached to its own preparation.
    const allScopes = new Set<string>();
    try {
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i);
        if (key?.startsWith(KEY_PREFIX)) allScopes.add(key.slice(KEY_PREFIX.length));
      }
    } catch {
      failClosed("Settlement evidence storage could not be enumerated.");
    }
    let existing: SettlementRecoveryRecord | null = null;
    for (const scope of allScopes) {
      const record = readRecord(store, scope);
      if (record?.preparation.preparationId === preparationId) {
        existing = record;
        break;
      }
    }
    if (!existing) {
      failClosed("Signed envelope does not match the persisted preparation.");
    }
    if (txHash !== existing.preparation.txHash) {
      failClosed("Signed envelope hash does not match the preparation.");
    }
    try {
      assertOriginal(existing.preparation.xdr, signedXdr, txHash);
    } catch {
      failClosed("Signed envelope changed the original transaction body.");
    }
    const record: SettlementRecoveryRecord = {
      ...existing,
      signedEnvelope: {
        signedXdr,
        txHash,
        savedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };
    const raw = JSON.stringify(record);
    readSettlementRecord(existing.scope, raw);
    try {
      store.setItem(keyForScope(existing.scope), raw);
    } catch {
      failClosed("Signed envelope could not be persisted.");
    }
  });
}

export async function loadSettlementRecovery(
  scope: string,
): Promise<SettlementRecoveryRecord | null> {
  return withRecoveryLock(async () => {
    try {
      return readRecord(storage(), scope);
    } catch {
      return null;
    }
  });
}

export async function clearSettlementRecovery(scope: string): Promise<void> {
  await withRecoveryLock(async () => {
    try {
      storage().removeItem(keyForScope(scope));
    } catch {
      // Clearing best-effort evidence must not block the UI.
    }
  });
}
