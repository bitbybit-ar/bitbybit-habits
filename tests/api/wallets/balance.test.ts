// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession } from "../../helpers";

// Mock NWC client
const mockGetBalance = vi.fn();
const mockGetInfo = vi.fn();
const mockClose = vi.fn();

vi.mock("@getalby/sdk", () => ({
  NWCClient: class {
    getBalance = mockGetBalance;
    getInfo = mockGetInfo;
    close = mockClose;
  },
}));

// Mock getDecryptedNwcUrl from the wallets route
const mockGetDecryptedNwcUrl = vi.fn();
vi.mock("@/app/api/wallets/route", () => ({
  getDecryptedNwcUrl: (...args: unknown[]) => mockGetDecryptedNwcUrl(...args),
}));

// Mock DB (needed by apiHandler)
vi.mock("@/lib/db", () => ({
  getDb: () => ({}),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(),
}));

import { GET } from "@/app/api/wallets/balance/route";

describe("GET /api/wallets/balance", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
  });

  it("returns 401 when not authenticated", async () => {
    const req = createRequest("GET", "/api/wallets/balance");
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(401);
  });

  it("returns null balance when no wallet connected", async () => {
    await setSessionCookie(testSession);
    mockGetDecryptedNwcUrl.mockResolvedValue(null);
    const req = createRequest("GET", "/api/wallets/balance");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(body.data.balance_sats).toBeNull();
    expect(body.data.node_info).toBeNull();
  });

  it("returns balance and node info when wallet is connected", async () => {
    await setSessionCookie(testSession);
    mockGetDecryptedNwcUrl.mockResolvedValue("nostr+walletconnect://test");
    // NWC returns balance in millisats (50000 msats = 50 sats)
    mockGetBalance.mockResolvedValue({ balance: 50000 });
    mockGetInfo.mockResolvedValue({
      alias: "TestNode",
      pubkey: "abc123",
      network: "mainnet",
      methods: ["pay_invoice", "make_invoice", "get_balance"],
      color: "#ff0000",
      block_height: 800000,
    });
    const req = createRequest("GET", "/api/wallets/balance");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(body.data.balance_sats).toBe(50);
    expect(body.data.node_info.alias).toBe("TestNode");
    expect(body.data.node_info.methods).toContain("pay_invoice");
    expect(mockClose).toHaveBeenCalled();
  });

  it("returns null balance when NWC call fails", async () => {
    await setSessionCookie(testSession);
    mockGetDecryptedNwcUrl.mockResolvedValue("nostr+walletconnect://test");
    mockGetBalance.mockRejectedValue(new Error("Connection refused"));
    mockGetInfo.mockRejectedValue(new Error("Connection refused"));
    const req = createRequest("GET", "/api/wallets/balance");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(body.data.balance_sats).toBeNull();
    expect(body.data.node_info).toBeNull();
    expect(mockClose).toHaveBeenCalled();
  });
});
