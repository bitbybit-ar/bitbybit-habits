// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession } from "../../helpers";

// Mock NWC client
const mockListTransactions = vi.fn();
const mockClose = vi.fn();

vi.mock("@getalby/sdk", () => ({
  NWCClient: class {
    listTransactions = mockListTransactions;
    close = mockClose;
  },
}));

const mockGetDecryptedNwcUrl = vi.fn();
vi.mock("@/app/api/wallets/route", () => ({
  getDecryptedNwcUrl: (...args: unknown[]) => mockGetDecryptedNwcUrl(...args),
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({}),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(),
}));

import { GET } from "@/app/api/wallets/transactions/route";

describe("GET /api/wallets/transactions", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
  });

  it("returns 401 when not authenticated", async () => {
    const req = createRequest("GET", "/api/wallets/transactions");
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(401);
  });

  it("returns 400 when no wallet connected", async () => {
    await setSessionCookie(testSession);
    mockGetDecryptedNwcUrl.mockResolvedValue(null);
    const req = createRequest("GET", "/api/wallets/transactions");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(400);
    expect(body.error).toBe("no_wallet");
  });

  it("returns transactions with default pagination", async () => {
    await setSessionCookie(testSession);
    mockGetDecryptedNwcUrl.mockResolvedValue("nostr+walletconnect://test");
    mockListTransactions.mockResolvedValue({
      transactions: [
        { type: "incoming", amount: 50000, description: "test payment", payment_hash: "abc123", preimage: "pre123", state: "settled", created_at: 1700000000, settled_at: 1700000001 },
        { type: "outgoing", amount: -20000, description: "sent", payment_hash: "def456", preimage: null, state: "settled", created_at: 1700000100, settled_at: 1700000101 },
      ],
    });

    const req = createRequest("GET", "/api/wallets/transactions");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(body.data.transactions).toHaveLength(2);
    expect(body.data.transactions[0].amount_sats).toBe(50);
    expect(body.data.transactions[0].type).toBe("incoming");
    expect(body.data.transactions[1].amount_sats).toBe(20);
    expect(body.data.has_more).toBe(false);
    expect(mockClose).toHaveBeenCalled();
  });

  it("respects limit and offset params", async () => {
    await setSessionCookie(testSession);
    mockGetDecryptedNwcUrl.mockResolvedValue("nostr+walletconnect://test");

    const txs = Array.from({ length: 6 }, (_, i) => ({
      type: "incoming", amount: (i + 1) * 1000, description: `tx${i}`,
      payment_hash: `hash${i}`, preimage: null, state: "settled",
      created_at: 1700000000 + i, settled_at: null,
    }));
    mockListTransactions.mockResolvedValue({ transactions: txs });

    const req = createRequest("GET", "/api/wallets/transactions", undefined, { limit: "2", offset: "1" });
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(body.data.transactions).toHaveLength(2);
    expect(body.data.transactions[0].description).toBe("tx1");
    expect(body.data.has_more).toBe(true);
  });

  it("returns empty transactions on NWC failure", async () => {
    await setSessionCookie(testSession);
    mockGetDecryptedNwcUrl.mockResolvedValue("nostr+walletconnect://test");
    mockListTransactions.mockRejectedValue(new Error("Connection refused"));

    const req = createRequest("GET", "/api/wallets/transactions");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(body.data.transactions).toEqual([]);
    expect(body.data.has_more).toBe(false);
    expect(mockClose).toHaveBeenCalled();
  });
});
