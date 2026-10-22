import { describe, expect, it } from "vitest";
import {
  formatUsdc,
  formatUsdcUnits,
  fromMicro,
  splitEvenlyMicro,
  sumMicro,
  toMicro,
} from "@/lib/usdc";

describe("toMicro", () => {
  it("parses plain, symbolled and grouped decimal amounts", () => {
    expect(toMicro("450.00")).toBe(450_000_000n);
    expect(toMicro("0.000001")).toBe(1n);
    expect(toMicro("7")).toBe(7_000_000n);
    expect(toMicro("$750.00 USDC")).toBe(750_000_000n);
    expect(toMicro("$1,800 USDC")).toBe(1_800_000_000n);
    expect(toMicro("₱ 18,500")).toBe(18_500_000_000n);
  });

  it("rejects malformed, negative and over-precise amounts", () => {
    expect(() => toMicro("abc")).toThrow();
    expect(() => toMicro("-5")).toThrow();
    expect(() => toMicro("1.0000001")).toThrow();
    expect(() => toMicro("")).toThrow();
  });
});

describe("fromMicro", () => {
  it("emits the canonical 6-decimal string form", () => {
    expect(fromMicro(450_000_000n)).toBe("450.000000");
    expect(fromMicro(1n)).toBe("0.000001");
    expect(fromMicro(1_200_000_000n)).toBe("1200.000000");
  });
});

describe("formatUsdcUnits", () => {
  it("shows 2 decimals for whole-cent amounts and up to 6 otherwise", () => {
    expect(formatUsdcUnits(750_000_000n)).toBe("750.00");
    expect(formatUsdcUnits(1n)).toBe("0.000001");
    expect(formatUsdcUnits(333_333_333n)).toBe("333.333333");
    expect(formatUsdcUnits(1_205_000n)).toBe("1.205");
  });
});

describe("formatUsdc", () => {
  it("renders the branded stablecoin form", () => {
    expect(formatUsdc(750_000_000n)).toBe("$750.00 USDC");
    expect(formatUsdc(1_800_000_000n)).toBe("$1800.00 USDC");
  });
});

describe("splitEvenlyMicro", () => {
  it("distributes the 1-micro remainder so parts sum back exactly", () => {
    expect(splitEvenlyMicro(1_000_003n, 4)).toEqual([
      250_001n,
      250_001n,
      250_001n,
      250_000n,
    ]);
    expect(splitEvenlyMicro(1_000_000n, 4)).toEqual([
      250_000n,
      250_000n,
      250_000n,
      250_000n,
    ]);
  });

  it("rejects non-positive part counts", () => {
    expect(() => splitEvenlyMicro(100n, 0)).toThrow();
  });
});

describe("sumMicro", () => {
  it("sums decimal strings without floating point", () => {
    expect(sumMicro(["450.00", "300.00", "0.000001"])).toBe(750_000_001n);
  });
});
