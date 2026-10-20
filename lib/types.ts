export const TESTNET = "Test SDF Network ; September 2015";
export type Prepared = {
  xdr: string;
  network: "testnet" | "mainnet";
  networkPassphrase: string;
  expiresAt: string;
  preparationRequestId?: string;
  txHash: string;
  /** Server-attested contribution amount for display; the envelope hash is the authority. */
  amountStroops: string;
};
export type PublicConfig =
  | { ready: false; message: string }
  | { ready: true; scope: string; deploymentUrl: string };
export type Result = { txHash: string; status: string; network?: string };
