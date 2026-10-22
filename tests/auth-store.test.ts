import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAccount,
  clearSession,
  getAccount,
  hasAccount,
  hasSession,
  registerAccount,
  setSession,
  verifyLogin,
} from "@/lib/auth-store";

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
});

const VALID = { email: "Alex@Example.com", phone: "+63 917 123 4567", password: "hunter2-pass" };

describe("auth-store session", () => {
  it("gates the app until a session is opened", () => {
    expect(hasSession()).toBe(false);
    setSession();
    expect(hasSession()).toBe(true);
    clearSession();
    expect(hasSession()).toBe(false);
  });
});

describe("auth-store registration", () => {
  it("registers a first-time account with email, phone, and password", async () => {
    const account = await registerAccount(VALID);
    expect(account.email).toBe("alex@example.com"); // normalized
    expect(account.phone).toBe("+63 917 123 4567");
    expect(hasAccount()).toBe(true);
    const stored = getAccount();
    expect(stored?.email).toBe("alex@example.com");
    expect(stored && "passwordHash" in stored).toBe(false); // secret stays out
  });

  it("rejects malformed email, phone, and short passwords", async () => {
    await expect(registerAccount({ ...VALID, email: "nope" })).rejects.toThrow("email");
    await expect(registerAccount({ ...VALID, phone: "12" })).rejects.toThrow("phone");
    await expect(registerAccount({ ...VALID, password: "short" })).rejects.toThrow("8 characters");
    expect(hasAccount()).toBe(false);
  });
});

describe("auth-store login verification", () => {
  it("accepts the registered email + password pair", async () => {
    await registerAccount(VALID);
    expect(
      await verifyLogin({ email: "alex@example.com", password: "hunter2-pass" }),
    ).toBe(true);
  });

  it("rejects a wrong password, wrong email, and unknown accounts", async () => {
    await registerAccount(VALID);
    expect(await verifyLogin({ email: "alex@example.com", password: "wrong-pass" })).toBe(false);
    expect(await verifyLogin({ email: "other@example.com", password: "hunter2-pass" })).toBe(false);
    clearAccount();
    expect(await verifyLogin({ email: "alex@example.com", password: "hunter2-pass" })).toBe(false);
  });

  it("fails closed when storage is unavailable", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    });
    expect(hasSession()).toBe(false);
    expect(hasAccount()).toBe(false);
    expect(await verifyLogin({ email: "a@b.co", password: "x" })).toBe(false);
    await expect(registerAccount(VALID)).rejects.toThrow("browser");
  });
});
