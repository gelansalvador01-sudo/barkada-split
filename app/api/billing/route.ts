import { handle, sameOrigin } from "@/lib/http";
import { settlementService } from "@/lib/paidflow-settlement";

/**
 * Paidflow billing layer: registers on-chain USDC billing intents for a
 * group expense and lists the open intents / balance tracker for a group.
 */
export async function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request);
    const text = await request.text();
    if (text.length > 16000) throw new Error("Request too large.");
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error("Invalid request.");
    const v = body as Record<string, unknown>;

    if (
      v.action === "create" &&
      typeof v.groupId === "string" &&
      typeof v.label === "string" &&
      typeof v.paidBy === "string" &&
      typeof v.total === "string" &&
      v.total.length <= 48 &&
      Array.isArray(v.members) &&
      v.members.every((member) => typeof member === "string") &&
      Object.keys(v).length === 6
    ) {
      return settlementService().registerBillingIntents({
        groupId: v.groupId,
        label: v.label,
        paidBy: v.paidBy,
        total: v.total,
        members: v.members as string[],
      });
    }

    if (
      v.action === "list" &&
      typeof v.groupId === "string" &&
      Object.keys(v).length === 2
    ) {
      return {
        intents: settlementService().openIntents(v.groupId),
        tracker: settlementService().balanceTracker(v.groupId),
      };
    }

    throw new Error("Invalid request.");
  });
}
