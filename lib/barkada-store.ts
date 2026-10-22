import { useEffect, useState, useSyncExternalStore } from "react";
import { fromMicro, splitEvenlyMicro, toMicro } from "@/lib/usdc";

export type GroupStatus = "owe" | "owed" | "settled";

export type ExpenseItem = {
  label: string;
  amount: string;
  paidBy: string;
};

export type Group = {
  id: string;
  name: string;
  emoji: string;
  total: string;
  elapsed: string;
  status: GroupStatus;
  /** Outstanding USDC balance for unsettled groups, e.g. "450.00". */
  amount?: string;
  organizer: string;
  people: string[];
  history: ExpenseItem[];
  settledAt?: string;
};

const STORAGE_KEY = "barkada-split:groups:v1";

export function seedGroups(): Group[] {
  return [
    {
      id: "siargao",
      name: "Siargao Trip",
      emoji: "🏄‍♂️",
      total: "18500.00",
      elapsed: "Yesterday",
      status: "owed",
      amount: "1200.00",
      organizer: "Mika",
      people: ["Mika", "Jopay", "Renz", "Bea", "Carlo", "Denz"],
      history: [
        { label: "Island hopping tour", amount: "4200.00", paidBy: "You" },
        { label: "Resort balance · 2 nights", amount: "9800.00", paidBy: "Mika" },
        { label: "Van rental (6 pax)", amount: "4500.00", paidBy: "Renz" },
      ],
    },
    {
      id: "samgyup",
      name: "Samgyupsal Night",
      emoji: "🥓",
      total: "1800.00",
      elapsed: "2h ago",
      status: "owe",
      amount: "450.00",
      organizer: "Jopay",
      people: ["Jopay", "Renz", "Bea"],
      history: [
        { label: "Unli samgyup ×4", amount: "1440.00", paidBy: "Jopay" },
        { label: "Cheese dip + drinks", amount: "360.00", paidBy: "Jopay" },
      ],
    },
    {
      id: "movie",
      name: "Movie Marathon",
      emoji: "🍿",
      total: "900.00",
      elapsed: "2d ago",
      status: "owe",
      amount: "300.00",
      organizer: "Mika",
      people: ["Mika", "Carlo"],
      history: [
        { label: "Premiere tickets ×2", amount: "700.00", paidBy: "Mika" },
        { label: "Popcorn + drinks", amount: "200.00", paidBy: "Carlo" },
      ],
    },
    {
      id: "baguio",
      name: "Baguio Weekend",
      emoji: "🚗",
      total: "7200.00",
      elapsed: "Last week",
      status: "settled",
      organizer: "Mika",
      people: ["Mika", "Jopay", "Renz", "Bea", "Carlo"],
      settledAt: "2d ago",
      history: [
        { label: "Cabin rental · 2 nights", amount: "5000.00", paidBy: "Mika" },
        { label: "Groceries + bbq", amount: "1500.00", paidBy: "You" },
        { label: "Gas + toll", amount: "700.00", paidBy: "Renz" },
      ],
    },
  ];
}

const serverSnapshot = seedGroups();
let current: Group[] | null = null;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

function load(): Group[] {
  if (current) return current;
  const store = storage();
  if (store) {
    try {
      const raw = store.getItem(STORAGE_KEY);
      if (raw) {
        current = JSON.parse(raw) as Group[];
        return current;
      }
    } catch {
      // Corrupt storage — fall through to the seed.
    }
  }
  current = seedGroups();
  return current;
}

function persist(next: Group[]): void {
  current = next;
  const store = storage();
  if (store) {
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked or full — state still updates in memory.
    }
  }
  listeners.forEach((listener) => listener());
}

export function subscribeGroups(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getGroups(): Group[] {
  return load();
}

export function getGroup(id: string): Group | undefined {
  return load().find((group) => group.id === id);
}

/** Live groups; returns the seed snapshot until hydration to avoid mismatch. */
export function useGroups(): Group[] {
  const groups = useSyncExternalStore(
    subscribeGroups,
    getGroups,
    () => serverSnapshot,
  );
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? groups : serverSnapshot;
}

function sumOutstanding(groups: Group[], status: GroupStatus): bigint {
  return groups
    .filter((group) => group.status === status)
    .reduce<bigint>((acc, group) => acc + (group.amount ? toMicro(group.amount) : 0n), 0n);
}

/** Outstanding totals in 6-decimal USDC micro units. */
export function totals(groups: Group[]): { owe: bigint; owed: bigint } {
  return {
    owe: sumOutstanding(groups, "owe"),
    owed: sumOutstanding(groups, "owed"),
  };
}

function settledGroup(group: Group): Group {
  return {
    ...group,
    status: "settled",
    amount: undefined,
    settledAt: "Just now",
    history: [
      ...group.history,
      {
        label: "Settlement — balance cleared",
        amount: group.amount ?? "0.000000",
        paidBy: "You",
      },
    ],
  };
}

/** Clear one group's outstanding "you owe" balance. */
export function settleGroup(id: string): void {
  const group = getGroup(id);
  if (!group || group.status !== "owe") return;
  persist(load().map((g) => (g.id === id ? settledGroup(g) : g)));
}

/** Batch-settle every "you owe" group; returns the cleared total in USDC micro units. */
export function settleAllOwed(): bigint {
  const groups = load();
  const total = sumOutstanding(groups, "owe");
  persist(groups.map((g) => (g.status === "owe" ? settledGroup(g) : g)));
  return total;
}

export function addGroup(input: {
  name: string;
  emoji: string;
  people: string[];
  organizer?: string;
}): Group {
  const slug =
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "barkada";
  const group: Group = {
    id: `${slug}-${Date.now().toString(36)}`,
    name: input.name,
    emoji: input.emoji,
    total: "0.000000",
    elapsed: "Just now",
    status: "settled",
    organizer: input.organizer ?? input.people[0] ?? "You",
    people: input.people,
    history: [],
  };
  persist([group, ...load()]);
  return group;
}

/** Add an expense to a group ledger and move its outstanding balance. */
export function addExpense(
  groupId: string,
  expense: { label: string; amount: string; paidBy: string },
): void {
  const micro = toMicro(expense.amount);
  if (micro <= 0n) throw new Error("Amount must be positive.");
  persist(
    load().map((g) => {
      if (g.id !== groupId) return g;
      const total = toMicro(g.total) + micro;
      const history = [
        ...g.history,
        { label: expense.label, amount: expense.amount, paidBy: expense.paidBy },
      ];
      const share =
        splitEvenlyMicro(micro, g.people.length + 1)[0] ?? 0n;
      const delta = expense.paidBy === "You" ? micro : share;
      const outstanding = g.amount ? toMicro(g.amount) + delta : delta;
      return {
        ...g,
        total: fromMicro(total),
        history,
        amount: fromMicro(outstanding),
        status: expense.paidBy === "You" ? ("owed" as const) : ("owe" as const),
      };
    }),
  );
}

export function resetDemo(): void {
  persist(seedGroups());
}
