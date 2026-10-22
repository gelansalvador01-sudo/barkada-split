import { handle, sameOrigin } from "@/lib/http";
import { settlementService } from "@/lib/paidflow-settlement";

/**
 * Mock Paidflow notification webhook (Nudge): wraps a defaulting member's
 * open payment links into an automated messaging alert. No funds move.
 */
export async function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request);
    const text = await request.text();
    if (text.length > 8000) throw new Error("Request too large.");
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error("Invalid request.");
    const v = body as Record<string, unknown>;

    if (
      v.action === "nudge" &&
      typeof v.groupId === "string" &&
      typeof v.member === "string" &&
      v.member.length <= 64 &&
      Object.keys(v).length === 3
    ) {
      return settlementService().nudge({
        groupId: v.groupId,
        member: v.member,
      });
    }

    throw new Error("Invalid request.");
  });
}
