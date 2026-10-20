export type Contribution = {
  txHash: string;
  amountStroops: string;
  at: string;
};
export type Contributions = { version: 1; scope: string; items: Contribution[] };
const LIMIT = 50;
function validItem(item: unknown): item is Contribution {
  const c = item as Contribution;
  return (
    !!c &&
    typeof c === "object" &&
    typeof c.txHash === "string" &&
    /^[a-f0-9]{64}$/.test(c.txHash) &&
    typeof c.amountStroops === "string" &&
    /^\d+$/.test(c.amountStroops) &&
    c.amountStroops.length <= 39 &&
    typeof c.at === "string" &&
    Number.isFinite(Date.parse(c.at))
  );
}
/**
 * Display-only local history of settled contributions. Unlike recovery
 * evidence this fails open: an unreadable or corrupt history must never
 * block a payment.
 */
export function readContributions(
  storage: Pick<Storage, "getItem">,
  scope: string,
): Contributions {
  const empty: Contributions = { version: 1, scope, items: [] };
  const raw = storage.getItem(`paiflow-contributions:v1:${scope}`);
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw) as Contributions;
    if (
      !parsed ||
      parsed.version !== 1 ||
      parsed.scope !== scope ||
      !Array.isArray(parsed.items) ||
      !parsed.items.every(validItem)
    )
      return empty;
    return parsed;
  } catch {
    return empty;
  }
}
export function recordContribution(
  storage: Pick<Storage, "getItem" | "setItem">,
  scope: string,
  contribution: Contribution,
) {
  if (!validItem(contribution)) return;
  const current = readContributions(storage, scope);
  if (current.items.some((item) => item.txHash === contribution.txHash))
    return; // Re-observing the same settled transaction never duplicates.
  current.items.push(contribution);
  if (current.items.length > LIMIT)
    current.items.splice(0, current.items.length - LIMIT);
  storage.setItem(
    `paiflow-contributions:v1:${scope}`,
    JSON.stringify(current),
  );
}
