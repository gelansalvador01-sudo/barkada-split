"use client";

import { connectWallet, signPrepared } from "@/lib/wallet";
import type { SettlementPreparation } from "@/lib/paidflow-types";

/**
 * Settlement signing bridge. The customer private key never leaves the
 * browser: Freighter signs the server-prepared envelope using the
 * server-prepared network passphrase, and the returned XDR is verified
 * against the preparation by lib/wallet before it is used.
 */

/** Connect the Freighter signer wallet; returns the Stellar address. */
export async function connectSignerWallet(): Promise<string> {
  return connectWallet();
}

/** Sign a settlement preparation with Freighter. Returns the exact signed envelope XDR. */
export async function signSettlementPreparation(
  preparation: SettlementPreparation,
  address: string,
): Promise<string> {
  return signPrepared(
    {
      xdr: preparation.xdr,
      network: preparation.network,
      networkPassphrase: preparation.networkPassphrase,
      expiresAt: preparation.expiresAt,
      txHash: preparation.txHash,
      amountStroops: preparation.microAmount,
    },
    address,
  );
}
