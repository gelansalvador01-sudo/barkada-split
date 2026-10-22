"use client";

/**
 * Demo-grade local authentication for Barkada-Split. Credentials live in
 * localStorage only: the password is never stored or compared in plaintext
 * (salted SHA-256 via Web Crypto, salt = normalized email). A session flag
 * gates the app screens. This is teaching code — production apps need a
 * server-side identity provider, rate limiting and durable storage.
 */

const ACCOUNT_KEY = "barkada-split:account";
const SESSION_KEY = "barkada-split:session";

export type Account = {
  email: string;
  phone: string;
  passwordHash: string;
  createdAt: string;
};

/** Account without secrets — safe to render in the UI. */
export type PublicAccount = Omit<Account, "passwordHash">;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s()-]{7,17}$/;

function readAccount(): Account | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    )
      return null;
    const candidate = parsed as Record<string, unknown>;
    if (
      typeof candidate.email !== "string" ||
      typeof candidate.phone !== "string" ||
      typeof candidate.passwordHash !== "string" ||
      typeof candidate.createdAt !== "string"
    )
      return null;
    return {
      email: candidate.email,
      phone: candidate.phone,
      passwordHash: candidate.passwordHash,
      createdAt: candidate.createdAt,
    };
  } catch {
    return null;
  }
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt}::${password}`),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/* ------------------------------ session ------------------------------ */

/** App screens require an active session; a missing flag means log in again. */
export function hasSession(): boolean {
  try {
    return localStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSession(): void {
  try {
    localStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Unavailable storage only means the gate replays on the next visit.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing persisted to clear.
  }
}

/* ------------------------------ account ------------------------------ */

export function hasAccount(): boolean {
  return readAccount() !== null;
}

export function getAccount(): PublicAccount | null {
  const account = readAccount();
  if (!account) return null;
  return { email: account.email, phone: account.phone, createdAt: account.createdAt };
}

/** Register the first-time account. Throws with a readable validation message. */
export async function registerAccount(input: {
  email: string;
  phone: string;
  password: string;
}): Promise<PublicAccount> {
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  if (!EMAIL_RE.test(email)) throw new Error("Enter a valid email address.");
  if (!PHONE_RE.test(phone)) throw new Error("Enter a valid phone number.");
  if (input.password.length < 8)
    throw new Error("Password must be at least 8 characters.");
  const account: Account = {
    email,
    phone,
    passwordHash: await hashPassword(input.password, email),
    createdAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  } catch {
    throw new Error("Could not save your account in this browser.");
  }
  return { email, phone, createdAt: account.createdAt };
}

/** Verify an email + password pair against the registered account. */
export async function verifyLogin(input: {
  email: string;
  password: string;
}): Promise<boolean> {
  const account = readAccount();
  if (!account) return false;
  const email = input.email.trim().toLowerCase();
  if (email !== account.email) return false;
  return (
    account.passwordHash === (await hashPassword(input.password, email))
  );
}

/** Remove the registered account (used by "Create another account"). */
export function clearAccount(): void {
  try {
    localStorage.removeItem(ACCOUNT_KEY);
  } catch {
    // Nothing persisted to clear.
  }
}
