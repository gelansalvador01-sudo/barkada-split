const SCALE = 10_000_000n;
const MAX = (1n << 127n) - 1n;
/** Invalid traveler input; mapped to a 422 VALIDATION response, not a 502. */
export class PaymentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentValidationError";
  }
}
export function toStroops(decimal: string): string {
  if (!/^\d+(?:\.\d{1,7})?$/.test(decimal) || decimal.length > 48)
    throw new PaymentValidationError(
      "Enter a positive decimal amount with at most 7 decimal places.",
    );
  const [whole = "0", fraction = ""] = decimal.split(".");
  const value = BigInt(whole) * SCALE + BigInt(fraction.padEnd(7, "0"));
  if (value <= 0n || value > MAX)
    throw new PaymentValidationError(
      "Amount must be positive and fit contract i128 arithmetic.",
    );
  return value.toString();
}
export function fromStroops(stroops: string): string {
  if (!/^\d+$/.test(stroops) || stroops.length > 39)
    throw new PaymentValidationError("Invalid stroops.");
  const value = BigInt(stroops);
  if (value > MAX) throw new PaymentValidationError("Amount exceeds i128.");
  const fraction = (value % SCALE)
    .toString()
    .padStart(7, "0")
    .replace(/0+$/, "");
  return `${value / SCALE}${fraction ? `.${fraction}` : ""}`;
}
