import { handle, sameOrigin } from "@/lib/http";
import { settlementService } from "@/lib/paidflow-settlement";

/**
 * Paidflow settlement layer: prepares a wallet-to-wallet settlement for
 * everything the user owes in a group, accepts the exact signed envelope,
 * and reconciles the submitted transaction. Narrowly validated, same-origin.
 */
export async function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request);
    const text = await request.text();
    if (text.length > 210000) throw new Error("Request too large.");
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error("Invalid request.");
    const v = body as Record<string, unknown>;

    if (
      v.action === "prepare" &&
      typeof v.groupId === "string" &&
      typeof v.from === "string" &&
      v.from.length <= 64 &&
      Object.keys(v).length === 3
    ) {
      return settlementService().prepareSettlement({
        groupId: v.groupId,
        from: v.from,
      });
    }

    if (
      v.action === "submit" &&
      typeof v.preparationId === "string" &&
      v.preparationId.length <= 64 &&
      typeof v.signedXdr === "string" &&
      v.signedXdr.length <= 200000 &&
      Object.keys(v).length === 3
    ) {
      return settlementService().submitSettlement({
        preparationId: v.preparationId,
        signedXdr: v.signedXdr,
      });
    }

    if (
      v.action === "status" &&
      typeof v.txHash === "string" &&
      v.txHash.length <= 128 &&
      Object.keys(v).length === 2
    ) {
      return settlementService().settlementStatus({ txHash: v.txHash });
    }

    throw new Error("Invalid request.");
  });
}
