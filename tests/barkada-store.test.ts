import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addExpense,
  addGroup,
  getGroup,
  getGroups,
  resetDemo,
  seedGroups,
  settleAllOwed,
  settleGroup,
  totals,
} from "@/lib/barkada-store";

let values: Map<string, string>;

beforeEach(() => {
  values = new Map();
  vi.stubGlobal("localStorage", {
    get length() {
      return values.size;
    },
    key: (i: number) => [...values.keys()][i] ?? null,
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v),
    removeItem: (k: string) => values.delete(k),
  });
  resetDemo();
});

describe("seed + totals", () => {
  it("opens with $750.00 USDC owed and $1,200 USDC collectible", () => {
    expect(totals(seedGroups())).toEqual({ owe: 750_000_000n, owed: 1_200_000_000n });
    expect(totals(getGroups())).toEqual({ owe: 750_000_000n, owed: 1_200_000_000n });
  });
});

describe("settleGroup", () => {
  it("clears a group's balance and appends settlement history", () => {
    settleGroup("samgyup");
    const group = getGroup("samgyup");
    expect(group?.status).toBe("settled");
    expect(group?.amount).toBeUndefined();
    expect(group?.settledAt).toBe("Just now");
    expect(group?.history.at(-1)?.label).toBe("Settlement — balance cleared");
    expect(totals(getGroups()).owe).toBe(300_000_000n);
  });

  it("ignores unknown ids and non-owe groups", () => {
    settleGroup("nope");
    settleGroup("siargao");
    expect(totals(getGroups())).toEqual({ owe: 750_000_000n, owed: 1_200_000_000n });
  });
});

describe("settleAllOwed", () => {
  it("batch-settles every owe group and returns the cleared total", () => {
    const cleared = settleAllOwed();
    expect(cleared).toBe(750_000_000n);
    const groups = getGroups();
    expect(groups.filter((g) => g.status === "owe")).toHaveLength(0);
    expect(totals(groups).owe).toBe(0n);
    expect(totals(groups).owed).toBe(1_200_000_000n);
  });
});

describe("addGroup", () => {
  it("prepends a fresh settled group with a zero total", () => {
    const group = addGroup({
      name: "Friday Inuman",
      emoji: "🍻",
      people: ["Lara", "Pat"],
    });
    expect(getGroups()[0]?.id).toBe(group.id);
    expect(group.total).toBe("0.000000");
    expect(group.status).toBe("settled");
    expect(group.organizer).toBe("Lara");
  });
});

describe("addExpense", () => {
  it("moves a settled group to owed when You paid", () => {
    addExpense("baguio", { label: "Strawberries", amount: "600.00", paidBy: "You" });
    const group = getGroup("baguio");
    expect(group?.status).toBe("owed");
    expect(group?.amount).toBe("600.000000");
    expect(group?.total).toBe("7800.000000");
    expect(group?.history.at(-1)?.label).toBe("Strawberries");
  });

  it("moves a settled group to owe for your share when someone else paid", () => {
    addExpense("baguio", { label: "Coffee", amount: "600.00", paidBy: "Mika" });
    const group = getGroup("baguio");
    // 6 members including You → share is 600 / 6 = 100.00
    expect(group?.status).toBe("owe");
    expect(group?.amount).toBe("100.000000");
  });

  it("accumulates onto an existing outstanding balance with 6-decimal precision", () => {
    addExpense("movie", { label: "Parking", amount: "100.00", paidBy: "Mika" });
    // The even split gives the first share the 1-micro remainder:
    // 33.333334 on top of the existing 300.00.
    expect(getGroup("movie")?.amount).toBe("333.333334");
  });

  it("rejects non-positive amounts", () => {
    expect(() =>
      addExpense("baguio", { label: "Free", amount: "0.000000", paidBy: "You" }),
    ).toThrow();
  });
});
