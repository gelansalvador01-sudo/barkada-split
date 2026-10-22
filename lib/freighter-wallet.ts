"use client";

import { useEffect, useSyncExternalStore } from "react";
import { connectWallet, refreshWallet } from "@/lib/wallet";

/**
 * Freighter connection state for the settlement flow. This is the wallet
 * that actually signs Paiflow envelopes (Stellar testnet); the EIP-1193
 * pill remains a secondary identity display only.
 *
 * Freighter has no account-change event API, so the store refreshes on
 * mount and after every explicit connect; signing-time verification in
 * lib/wallet.ts (refreshWallet + signerAddress checks) is the authority.
 */

export type FreighterWalletState = {
  status: "unavailable" | "disconnected" | "connecting" | "connected";
  /** Stellar G… address of the connected Freighter account. */
  address: string | null;
  error: string | null;
};

const DISCONNECTED: FreighterWalletState = {
  status: "disconnected",
  address: null,
  error: null,
};

const listeners = new Set<() => void>();
let state: FreighterWalletState = DISCONNECTED;

function emit(next: FreighterWalletState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

export function subscribeFreighterWallet(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function freighterWalletSnapshot(): FreighterWalletState {
  return state;
}

/** True once Freighter has authorized at least one account in this app. */
export async function refreshFreighterWallet(): Promise<void> {
  try {
    const address = await refreshWallet();
    emit({ status: "connected", address, error: null });
  } catch {
    // Freighter missing or not authorized — keep the current state; an
    // explicit connect surfaces the real error message.
  }
}

/** Request Freighter access. Throws with a actionable message on rejection. */
export async function connectFreighterWallet(): Promise<string> {
  emit({ ...state, status: "connecting", error: null });
  try {
    const address = await connectWallet();
    emit({ status: "connected", address, error: null });
    return address;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Freighter connection failed.";
    emit({ ...DISCONNECTED, error: message });
    throw new Error(message);
  }
}

/** Local disconnect only — Freighter has no revoke API. Next prepare re-checks. */
export function disconnectFreighterWallet(): void {
  emit({ ...DISCONNECTED });
}

export function useFreighterWallet(): FreighterWalletState {
  const snapshot = useSyncExternalStore(
    subscribeFreighterWallet,
    freighterWalletSnapshot,
    () => DISCONNECTED,
  );
  useEffect(() => {
    void refreshFreighterWallet();
  }, []);
  return snapshot;
}

export function truncateStellarAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
