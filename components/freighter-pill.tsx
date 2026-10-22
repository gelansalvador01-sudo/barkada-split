"use client";

import {
  connectFreighterWallet,
  disconnectFreighterWallet,
  truncateStellarAddress,
  useFreighterWallet,
} from "@/lib/freighter-wallet";
import { toast } from "@/lib/toast-bus";
import { BoltIcon } from "@/components/bs-icons";

/**
 * Header Freighter pill: the wallet that actually signs Paiflow settlement
 * envelopes. Connected state shows the truncated Stellar address with a
 * TESTNET chip; clicking again disconnects locally (Freighter has no
 * revoke API — the next prepare re-verifies the signer).
 */
export function FreighterPill() {
  const wallet = useFreighterWallet();

  const handleConnect = async () => {
    try {
      await connectFreighterWallet();
      toast("Freighter connected — you can settle with Paidflow ⚡");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Freighter connection failed.");
    }
  };

  if (wallet.status === "connected" && wallet.address) {
    return (
      <button
        type="button"
        onClick={disconnectFreighterWallet}
        aria-label={`Disconnect Freighter ${wallet.address}`}
        title="Tap to disconnect"
        className="flex h-11 items-center gap-2 rounded-2xl border border-lavender/25 bg-lavender/10 px-3 text-xs font-bold text-lavender transition hover:border-lavender/50 hover:bg-lavender/15 active:scale-95"
      >
        <span className="size-2 rounded-full bg-lavender shadow-[0_0_8px_#C3B1E1]" />
        <span className="font-mono">{truncateStellarAddress(wallet.address)}</span>
        <span className="rounded-full bg-lavender/20 px-1.5 py-0.5 text-[9px] font-bold tracking-wide">
          TESTNET
        </span>
      </button>
    );
  }

  if (wallet.status === "connecting") {
    return (
      <span
        role="status"
        className="flex h-11 items-center gap-2 rounded-2xl border border-lavender/20 bg-white/[0.03] px-3 text-xs font-semibold text-lavender"
      >
        <span className="size-3.5 animate-spin rounded-full border-2 border-lavender/30 border-t-lavender" />
        Freighter…
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleConnect}
      className="flex h-11 items-center gap-1.5 rounded-2xl border border-lavender/15 bg-white/[0.03] px-3 text-xs font-bold text-white/60 transition hover:border-lavender/40 hover:bg-white/[0.06] hover:text-white active:scale-95"
    >
      <BoltIcon className="size-3.5 text-lavender" />
      Freighter
    </button>
  );
}
