/**
 * USDC stablecoin arithmetic in 6-decimal micro units, matching native
 * ERC-20 / SPL token formats. Amounts are strings at rest and bigint in
 * flight — never floating point — per the repo's amount-handling rule.
 *
 *   1 USDC = 1_000_000n micro units
 */
export const USDC_DECIMALS = 6;
export const MICRO = 1_000_000n;

/** Parse a decimal USDC amount (tolerates "$", "USDC", commas, whitespace). */
export function toMicro(value: string): bigint {
  const normalized = value.replace(/[$₱,\s]|USDC/gi, "");
  if (!/^\d+(\.\d{1,6})?$/.test(normalized)) {
    throw new Error(`Invalid USDC amount: "${value}"`);
  }
  const [whole = "0", frac = ""] = normalized.split(".");
  return BigInt(whole) * MICRO + BigInt((frac + "000000").slice(0, USDC_DECIMALS));
}

/** Canonical 6-decimal string form of a micro-unit amount. */
export function fromMicro(micro: bigint): string {
  const negative = micro < 0n;
  const abs = negative ? -micro : micro;
  const whole = abs / MICRO;
  const frac = (abs % MICRO).toString().padStart(USDC_DECIMALS, "0");
  return `${negative ? "-" : ""}${whole.toString()}.${frac}`;
}

/**
 * Display form without symbol: 2 decimals for whole-cent amounts, otherwise
 * up to 6 decimals with trailing zeros trimmed (minimum 2).
 *   750_000_000n -> "750.00"   1n -> "0.000001"   333_333_333n -> "333.333333"
 */
export function formatUsdcUnits(micro: bigint): string {
  const negative = micro < 0n;
  const abs = negative ? -micro : micro;
  const whole = (abs / MICRO).toString();
  let frac = (abs % MICRO).toString().padStart(USDC_DECIMALS, "0");
  frac = frac.replace(/0+$/, "");
  if (frac.length === 0) frac = "00";
  else if (frac.length === 1) frac = `${frac}0`;
  return `${negative ? "-" : ""}${whole}.${frac}`;
}

/** Branded display: "$750.00 USDC". */
export function formatUsdc(micro: bigint): string {
  return `$${formatUsdcUnits(micro)} USDC`;
}

/**
 * Split a micro-unit total into `parts` near-equal whole-micro amounts;
 * the 1-micro remainder is distributed one unit at a time so the parts
 * always sum back to the total exactly.
 */
export function splitEvenlyMicro(total: bigint, parts: number): bigint[] {
  if (parts <= 0) throw new Error("Parts must be positive.");
  const base = total / BigInt(parts);
  let remainder = total % BigInt(parts);
  return Array.from({ length: parts }, () => {
    const extra = remainder > 0n ? 1n : 0n;
    remainder -= extra;
    return base + extra;
  });
}

/** Sum a list of decimal-string USDC amounts into micro units. */
export function sumMicro(amounts: string[]): bigint {
  return amounts.reduce<bigint>((acc, value) => acc + toMicro(value), 0n);
}
