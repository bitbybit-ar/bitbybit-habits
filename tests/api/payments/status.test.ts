// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, UUID } from "../../helpers";

// Mock NWC client
const mockLookupInvoice = vi.fn();
const mockClose = vi.fn();

vi.mock("@getalby/sdk", () => ({
  NWCClient: class {
    lookupInvoice = mockLookupInvoice;
    close = mockClose;
  },
}));

// Mock DB
const mockSelectResult = vi.fn();
const mockUpdateSet = vi.fn();

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: () => {
      const chain: Record<string, unknown> = {};
      const self = () => chain;
      chain.from = self; chain.where = self; chain.limit = self;
      chain.then = (r: (v: unknown) => void) => r(mockSelectResult());
      return chain;
    },
    update: () => ({
      set: (...args: unknown[]) => {
        mockUpdateSet(...args);
        return { where: vi.fn() };
      },
    }),
  }),
  payments: { id: "id", from_user_id: "f", to_user_id: "t", status: "s", payment_hash: "ph", paid_at: "pa" },
  wallets: { user_id: "u", active: "a", nwc_url_encrypted: "nwc" },
}));

vi.mock("@/lib/crypto", () => ({
  decrypt: vi.fn((s: string) => s.replace("enc_", "")),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(),
}));

import { GET } from "@/app/api/payments/[id]/status/route";

const routeCtx = { params: Promise.resolve({ id: UUID.payment1 }) };

describe("GET /api/payments/[id]/status", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
  });

  it("returns 401 when not authenticated", async () => {
    const req = createRequest("GET", `/api/payments/${UUID.payment1}/status`);
    const { status } = await parseResponse(await GET(req, routeCtx));
    expect(status).toBe(401);
  });

  it("returns 404 when payment not found", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValueOnce([]);
    const req = createRequest("GET", `/api/payments/${UUID.payment1}/status`);
    const { status, body } = await parseResponse(await GET(req, routeCtx));
    expect(status).toBe(404);
    expect(body.success).toBe(false);
  });

  it("returns 403 when user is not payer or payee", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.payment1,
      status: "pending",
      payment_hash: "abc123",
      from_user_id: UUID.user3,
      to_user_id: UUID.user2,
    }]);
    const req = createRequest("GET", `/api/payments/${UUID.payment1}/status`);
    const { status } = await parseResponse(await GET(req, routeCtx));
    expect(status).toBe(403);
  });

  it("returns settled: true for already paid payment", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.payment1,
      status: "paid",
      payment_hash: "abc123",
      from_user_id: UUID.user1,
      to_user_id: UUID.user2,
    }]);
    const req = createRequest("GET", `/api/payments/${UUID.payment1}/status`);
    const { status, body } = await parseResponse(await GET(req, routeCtx));
    expect(status).toBe(200);
    expect(body.data.settled).toBe(true);
  });

  it("returns settled: false when no payment_hash", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.payment1,
      status: "pending",
      payment_hash: null,
      from_user_id: UUID.user1,
      to_user_id: UUID.user2,
    }]);
    const req = createRequest("GET", `/api/payments/${UUID.payment1}/status`);
    const { status, body } = await parseResponse(await GET(req, routeCtx));
    expect(status).toBe(200);
    expect(body.data.settled).toBe(false);
  });

  it("returns settled: false when kid has no wallet", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.payment1,
      status: "pending",
      payment_hash: "abc123",
      from_user_id: UUID.user1,
      to_user_id: UUID.user2,
    }]);
    mockSelectResult.mockReturnValueOnce([]); // no wallet
    const req = createRequest("GET", `/api/payments/${UUID.payment1}/status`);
    const { status, body } = await parseResponse(await GET(req, routeCtx));
    expect(status).toBe(200);
    expect(body.data.settled).toBe(false);
  });

  it("updates payment to paid when invoice settled", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.payment1,
      status: "pending",
      payment_hash: "abc123",
      from_user_id: UUID.user1,
      to_user_id: UUID.user2,
    }]);
    mockSelectResult.mockReturnValueOnce([{
      nwc_url_encrypted: "enc_nostr+walletconnect://test",
    }]);
    mockLookupInvoice.mockResolvedValue({ settled_at: 1234567890 });

    const req = createRequest("GET", `/api/payments/${UUID.payment1}/status`);
    const { status, body } = await parseResponse(await GET(req, routeCtx));
    expect(status).toBe(200);
    expect(body.data.settled).toBe(true);
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "paid" })
    );
    expect(mockClose).toHaveBeenCalled();
  });

  it("returns settled: false when invoice not yet paid", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.payment1,
      status: "pending",
      payment_hash: "abc123",
      from_user_id: UUID.user1,
      to_user_id: UUID.user2,
    }]);
    mockSelectResult.mockReturnValueOnce([{
      nwc_url_encrypted: "enc_nostr+walletconnect://test",
    }]);
    mockLookupInvoice.mockResolvedValue({ settled_at: null });

    const req = createRequest("GET", `/api/payments/${UUID.payment1}/status`);
    const { status, body } = await parseResponse(await GET(req, routeCtx));
    expect(status).toBe(200);
    expect(body.data.settled).toBe(false);
    expect(mockClose).toHaveBeenCalled();
  });

  it("returns settled: false on NWC timeout", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.payment1,
      status: "pending",
      payment_hash: "abc123",
      from_user_id: UUID.user1,
      to_user_id: UUID.user2,
    }]);
    mockSelectResult.mockReturnValueOnce([{
      nwc_url_encrypted: "enc_nostr+walletconnect://test",
    }]);
    mockLookupInvoice.mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 100))
    );

    const req = createRequest("GET", `/api/payments/${UUID.payment1}/status`);
    const { status, body } = await parseResponse(await GET(req, routeCtx));
    expect(status).toBe(200);
    expect(body.data.settled).toBe(false);
    expect(mockClose).toHaveBeenCalled();
  });
});
