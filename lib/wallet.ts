"use client";
// @stellar/freighter-api@6 ships a CJS bundle whose runtime only populates
// the DEFAULT export (the named exports exist in the .d.ts but resolve to
// undefined after bundling). Always go through the default export, and
// verify the API shape before first use so packaging drift surfaces as a
// clear "install Freighter" message instead of a TypeError.
import freighterApi from "@stellar/freighter-api";
import type { Prepared } from "@/lib/types";

const { isConnected, requestAccess, getAddress, getNetworkDetails, signTransaction } =
  freighterApi;

function assertFreighterApiShape(): void {
  if (
    typeof isConnected !== "function" ||
    typeof requestAccess !== "function" ||
    typeof getAddress !== "function" ||
    typeof getNetworkDetails !== "function" ||
    typeof signTransaction !== "function"
  ) {
    throw new Error(
      "Install or enable Freighter at freighter.app, then reload this page to connect your testnet wallet.",
    );
  }
}
export async function connectWallet() {
  await requireFreighter();
  const result = await bounded(
    requestAccess(),
    60000,
    "Freighter did not answer. Open the extension to review access, then try again.",
  );
  if (result.error) throw new Error(result.error.message);
  if (!result.address)
    throw new Error("Install Freighter and allow this app to connect.");
  return result.address;
}
export async function refreshWallet() {
  await requireFreighter();
  const result = await bounded(
    getAddress(),
    5000,
    "Freighter did not answer. Open the extension and try again.",
  );
  if (result.error) throw new Error(result.error.message);
  return result.address;
}
export async function signPrepared(prepared: Prepared, address: string) {
  if (
    prepared.network !== "testnet" ||
    prepared.networkPassphrase !== "Test SDF Network ; September 2015"
  )
    throw new Error("Only Testnet payments are allowed.");
  const expires = Date.parse(prepared.expiresAt);
  if (!Number.isFinite(expires) || Date.now() >= expires)
    throw new Error(
      "Preparation expired. Keep the original record and check its status; expiry alone does not prove it cannot execute.",
    );
  if ((await refreshWallet()) !== address)
    throw new Error(
      "Wallet changed. Reconnect the original wallet and retain this payment record.",
    );
  const network = await getNetworkDetails();
  if (network.error) throw new Error(network.error.message);
  if (network.networkPassphrase !== prepared.networkPassphrase)
    throw new Error("Switch Freighter to Testnet before signing.");
  const signed = await signTransaction(prepared.xdr, {
    networkPassphrase: prepared.networkPassphrase,
    address,
  });
  if (signed.error) throw new Error(signed.error.message);
  if (!signed.signedTxXdr)
    throw new Error("Freighter did not return a signed transaction.");
  if (signed.signerAddress !== address)
    throw new Error(
      "Freighter signed with a different customer. Reconnect the original wallet and retain this payment record.",
    );
  return signed.signedTxXdr;
}

export async function bounded<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
async function requireFreighter() {
  const message =
    "Install or enable Freighter at freighter.app, then reload this page to connect your testnet wallet.";
  assertFreighterApiShape();
  const result = await bounded(isConnected(), 2000, message);
  if (result.error || !result.isConnected) throw new Error(message);
}
