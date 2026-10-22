import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BarkadaSplitApp } from "@/components/barkada-split-app";
import { resetDemo } from "@/lib/barkada-store";
import { toast } from "@/lib/toast-bus";

const pushMock = vi.fn();

const mocks = vi.hoisted(() => ({
  runSettlement: vi.fn(),
  sendNudge: vi.fn(),
  connectFreighterWallet: vi.fn(),
  disconnectFreighterWallet: vi.fn(),
  useFreighterWallet: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/",
}));
// Render portals inline: react-test-renderer cannot manage foreign DOM
// containers; portal mechanics are exercised by react-dom in the browser.
vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>();
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  };
});
vi.mock("@/lib/toast-bus", () => ({
  toast: vi.fn(),
  flashToast: vi.fn(),
  bindToast: vi.fn(() => () => {}),
  consumeFlash: vi.fn(() => null),
}));
vi.mock("@/lib/freighter-wallet", () => ({
  useFreighterWallet: mocks.useFreighterWallet,
  connectFreighterWallet: mocks.connectFreighterWallet,
  disconnectFreighterWallet: mocks.disconnectFreighterWallet,
  truncateStellarAddress: (address: string) => address,
  subscribeFreighterWallet: vi.fn(() => () => {}),
  freighterWalletSnapshot: vi.fn(() => ({ status: "disconnected" })),
}));
vi.mock("@/lib/settlement-runner", () => ({
  runSettlement: mocks.runSettlement,
}));
vi.mock("@/lib/paidflow-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/paidflow-client")>();
  return {
    ...actual,
    sendNudge: mocks.sendNudge,
  };
});

const FREIGHTER_CONNECTED = {
  status: "connected" as const,
  address: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  error: null,
};

const FREIGHTER_DISCONNECTED = {
  status: "disconnected" as const,
  address: null,
  error: null,
};

let renderer: ReactTestRenderer | undefined;
let values: Map<string, string>;

function buttons() {
  return renderer!.root.findAllByType("button");
}

function instanceText(node: ReactTestInstance): string {
  return node.children
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? String(child)
        : instanceText(child),
    )
    .join(" ")
    .replace(/\s+/g, " ");
}

function clickButton(match: string | RegExp) {
  const target = buttons().find((node) => {
    const label = instanceText(node);
    const aria = (node.props["aria-label"] as string | undefined) ?? "";
    const haystack = `${label} ${aria}`.trim().replace(/\s+/g, " ");
    return typeof match === "string"
      ? haystack.includes(match)
      : match.test(haystack);
  });
  if (!target) throw new Error(`button not found: ${match}`);
  act(() => {
    target.props.onClick({ stopPropagation: () => {} });
  });
}

function allText(): string {
  return instanceText(renderer!.root);
}

function articles() {
  return renderer!.root.findAllByType("article");
}

/** Flush pending promise callbacks inside act. */
async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  values = new Map();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("document", { body: { nodeType: 1 } });
  vi.stubGlobal("localStorage", {
    get length() {
      return values.size;
    },
    key: (i: number) => [...values.keys()][i] ?? null,
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v),
    removeItem: (k: string) => values.delete(k),
  });
  vi.useFakeTimers();
  mocks.useFreighterWallet.mockReturnValue(FREIGHTER_CONNECTED);
  mocks.connectFreighterWallet.mockResolvedValue(FREIGHTER_CONNECTED.address);
  mocks.runSettlement.mockResolvedValue({
    txHash: "tx_fixture",
    status: "confirmed",
    confirmedAt: new Date().toISOString(),
  });
  mocks.sendNudge.mockResolvedValue({
    reference: "nudge_test",
    groupId: "siargao",
    member: "Mika",
    channel: "paidflow-webhook",
    paymentUrl: "/pay/bi_test",
    deliveredAt: new Date().toISOString(),
    message: "Paidflow nudge",
  });
  resetDemo();
  renderer = undefined;
  act(() => {
    renderer = create(<BarkadaSplitApp />);
  });
});

afterEach(() => {
  act(() => renderer?.unmount());
  vi.useRealTimers();
});

describe("dashboard interactivity", () => {
  it("filters the feed with the stats chips", () => {
    expect(articles()).toHaveLength(4);
    clickButton("You owe $");
    expect(articles()).toHaveLength(2);
    clickButton("You owe $"); // toggles back off
    expect(articles()).toHaveLength(4);
    clickButton("Owed to you");
    expect(articles()).toHaveLength(1);
  });

  it("routes to the profile view from the avatar", () => {
    const avatar = buttons().find(
      (node) => node.props["aria-label"] === "Open profile",
    );
    expect(avatar).toBeDefined();
    act(() => {
      avatar!.props.onClick({});
    });
    expect(pushMock).toHaveBeenCalledWith("/profile");
  });

  it("toggles the notifications panel from the bell", () => {
    expect(allText()).not.toContain("Pending invites");
    clickButton(/^Notifications$/);
    expect(allText()).toContain("Pending invites");
    expect(allText()).toContain("BGC Brunch Club");
  });

  it("accepting an invite creates the group", () => {
    clickButton(/^Notifications$/);
    clickButton("Join");
    expect(toast).toHaveBeenCalledWith(
      expect.stringContaining("You joined Intramuros Photowalk"),
    );
    expect(allText()).toContain("Intramuros Photowalk");
  });

  it("nudge calls the Paidflow webhook client and toasts success", async () => {
    const nudge = buttons().find(
      (node) => node.props["aria-label"] === "Nudge Siargao Trip",
    );
    act(() => {
      nudge!.props.onClick({ stopPropagation: () => {} });
    });
    await flush();
    expect(mocks.sendNudge).toHaveBeenCalledWith({
      groupId: "siargao",
      member: "Mika",
    });
    expect(toast).toHaveBeenCalledWith(
      "Nudge sent successfully to group members!",
    );
  });

  it("opens the Settle All modal and batch-settles through Paidflow", async () => {
    clickButton("Settle All");
    expect(allText()).toContain("Settle all debts?");
    expect(allText()).toContain("Confirm & pay $750.00 USDC");
    clickButton("Confirm & pay");
    await flush();
    expect(mocks.runSettlement).toHaveBeenCalledTimes(2);
    expect(allText()).toContain("All debts cleared");
    clickButton(/^Done$/);
    expect(toast).toHaveBeenCalledWith(
      "Batch payment complete — $750.00 USDC cleared ⚡",
    );
    expect(allText()).toContain("$0.00 USDC");
    expect(allText()).not.toContain("You owe $450.00 USDC");
    expect(allText()).toContain("All settled");
  });

  it("single-card settle confirms on-chain and updates the header total", async () => {
    const settle = buttons().find(
      (node) => node.props["aria-label"] === "Settle Samgyupsal Night",
    );
    act(() => {
      settle!.props.onClick({ stopPropagation: () => {} });
    });
    await flush();
    expect(mocks.runSettlement).toHaveBeenCalledWith("samgyup", {
      onPhase: expect.any(Function),
    });
    expect(toast).toHaveBeenCalledWith(
      "Paidflow confirmed $450.00 USDC · Samgyupsal Night settled ✅",
    );
    expect(allText()).toContain("$300.00 USDC");
    expect(allText()).toContain("All settled");
  });

  it("falls back to Connect Freighter to Settle when Freighter is not linked", async () => {
    mocks.useFreighterWallet.mockReturnValue(FREIGHTER_DISCONNECTED);
    act(() => {
      renderer!.update(<BarkadaSplitApp />);
    });
    expect(allText()).toContain("Connect Freighter to Settle");
    const cardSettle = buttons().find(
      (node) =>
        node.props["aria-label"] === "Connect Freighter to settle Samgyupsal Night",
    );
    expect(cardSettle).toBeDefined();
    act(() => {
      cardSettle!.props.onClick({ stopPropagation: () => {} });
    });
    await flush();
    expect(mocks.connectFreighterWallet).toHaveBeenCalled();
  });

  it("routes a card tap into the group ledger view", () => {
    const siargao = articles().find((node) =>
      instanceText(node).includes("Siargao Trip"),
    );
    act(() => {
      siargao!.props.onClick({});
    });
    expect(pushMock).toHaveBeenCalledWith("/groups/siargao");
  });

  it("opens the receipt scanner from the banner", () => {
    clickButton("Split something new");
    expect(allText()).toContain("Receipt scanner");
    clickButton(/^Capture receipt$/);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(allText()).toContain("OCR result");
    expect(allText()).toContain("$1,280.00 USDC");
    clickButton("Start itemized split");
    expect(pushMock).toHaveBeenCalledWith(
      "/split/new?merchant=Seoul+Kitchen&total=1280.00",
    );
  });
});
