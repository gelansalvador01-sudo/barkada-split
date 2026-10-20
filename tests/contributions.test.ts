import { describe, expect, it } from "vitest";
import {
  readContributions,
  recordContribution,
} from "@/lib/contributions";
const scope = "https://beta.app.paiflow.xyz/deployment";
const item = {
  txHash: "a".repeat(64),
  amountStroops: "10000000",
  at: "2026-10-20T00:00:00Z",
};
function store(initial?: string) {
  const values = new Map<string, string>(initial ? [[`paiflow-contributions:v1:${scope}`, initial]] : []);
  return {
    values,
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
}
describe("contributions history", () => {
  it("returns an empty history when absent or corrupt", () => {
    expect(readContributions(store(), scope).items).toEqual([]);
    expect(readContributions(store("not json"), scope).items).toEqual([]);
    expect(
      readContributions(
        store(JSON.stringify({ version: 1, scope, items: [{ txHash: 7 }] })),
        scope,
      ).items,
    ).toEqual([]);
    expect(
      readContributions(
        store(JSON.stringify({ version: 1, scope: "other", items: [item] })),
        scope,
      ).items,
    ).toEqual([]);
  });
  it("records, deduplicates by transaction hash, and caps the history", () => {
    const storage = store();
    recordContribution(storage, scope, item);
    expect(readContributions(storage, scope).items).toEqual([item]);
    recordContribution(storage, scope, { ...item, amountStroops: "1" });
    expect(readContributions(storage, scope).items).toEqual([item]);
    for (let i = 0; i < 60; i++) {
      recordContribution(storage, scope, {
        ...item,
        txHash: i.toString(16).padStart(64, "0"),
      });
    }
    const items = readContributions(storage, scope).items;
    expect(items.length).toBe(50);
    expect(new Set(items.map((x) => x.txHash)).size).toBe(items.length);
  });
  it("ignores malformed contributions", () => {
    const storage = store();
    recordContribution(storage, scope, {
      ...item,
      txHash: "not-a-hash",
    });
    recordContribution(storage, scope, { ...item, amountStroops: "0".repeat(40) });
    recordContribution(storage, scope, { ...item, at: "not-a-date" });
    expect(readContributions(storage, scope).items).toEqual([]);
  });
});
