// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, kidSession, UUID } from "../../helpers";

// Mock NWC client
const mockMakeInvoice = vi.fn();
const mockClose = vi.fn();

vi.mock("@getalby/sdk", () => ({
  NWCClient: class {
    makeInvoice = mockMakeInvoice;
    close = mockClose;
  },
}));

// Mock DB
const mockSelectResult = vi.fn();
const mockInsertReturning = vi.fn();

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: () => {
      const chain: Record<string, unknown> = {};
      const self = () => chain;
      chain.from = self; chain.where = self; chain.limit = self;
      chain.innerJoin = self;
      chain.then = (r: (v: unknown) => void) => r(mockSelectResult());
      return chain;
    },
    insert: () => ({ values: () => ({ returning: mockInsertReturning }) }),
  }),
  completions: { id: "id", user_id: "u", habit_id: "h", status: "s" },
  habits: { id: "id", name: "n" },
  payments: { id: "id", completion_id: "c", from_user_id: "f", to_user_id: "t", amount_sats: "a", payment_request: "pr", payment_hash: "ph", status: "s" },
  wallets: { user_id: "u", active: "a", nwc_url_encrypted: "nwc" },
}));

vi.mock("@/lib/crypto", () => ({
  decrypt: vi.fn((s: string) => s.replace("enc_", "")),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(),
}));

import { POST } from "@/app/api/payments/invoice/route";

describe("POST /api/payments/invoice", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
  });

  it("returns 401 when not authenticated", async () => {
    const req = createRequest("POST", "/api/payments/invoice", {
      completion_id: UUID.completion1,
      amount_sats: 50,
    });
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(401);
  });

  it("returns 403 when kid tries to create invoice", async () => {
    await setSessionCookie(kidSession);
    const req = createRequest("POST", "/api/payments/invoice", {
      completion_id: UUID.completion1,
      amount_sats: 50,
    });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(403);
    expect(body.success).toBe(false);
  });

  it("returns 400 when missing fields", async () => {
    await setSessionCookie(testSession);
    const req = createRequest("POST", "/api/payments/invoice", {});
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 400 when completion not found", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValueOnce([]); // completions empty
    const req = createRequest("POST", "/api/payments/invoice", {
      completion_id: UUID.completion1,
      amount_sats: 50,
    });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(body.error).toContain("completion_not_found");
  });

  it("returns 422 when kid has no wallet", async () => {
    await setSessionCookie(testSession);
    // First select: completion found
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.completion1,
      user_id: UUID.user2,
      habit_id: UUID.habit1,
      status: "approved",
    }]);
    // Second select: habit
    mockSelectResult.mockReturnValueOnce([{ name: "Tender la cama" }]);
    // Third select: wallet not found
    mockSelectResult.mockReturnValueOnce([]);

    const req = createRequest("POST", "/api/payments/invoice", {
      completion_id: UUID.completion1,
      amount_sats: 50,
    });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(422);
    expect(body.error).toBe("kid_no_wallet");
  });

  it("returns invoice when kid has wallet", async () => {
    await setSessionCookie(testSession);
    // First select: completion found
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.completion1,
      user_id: UUID.user2,
      habit_id: UUID.habit1,
      status: "approved",
    }]);
    // Second select: habit
    mockSelectResult.mockReturnValueOnce([{ name: "Tender la cama" }]);
    // Third select: wallet found
    mockSelectResult.mockReturnValueOnce([{
      nwc_url_encrypted: "enc_nostr+walletconnect://test",
    }]);

    mockMakeInvoice.mockResolvedValue({
      invoice: "lnbc500n1...",
      payment_hash: "abc123hash",
    });

    mockInsertReturning.mockResolvedValue([{
      id: UUID.payment1,
      completion_id: UUID.completion1,
    }]);

    const req = createRequest("POST", "/api/payments/invoice", {
      completion_id: UUID.completion1,
      amount_sats: 50,
    });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.paymentRequest).toBe("lnbc500n1...");
    expect(body.data.paymentHash).toBe("abc123hash");
    expect(body.data.payment_id).toBe(UUID.payment1);
    expect(mockClose).toHaveBeenCalled();
  });

  it("closes NWC client even on error", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.completion1,
      user_id: UUID.user2,
      habit_id: UUID.habit1,
      status: "approved",
    }]);
    mockSelectResult.mockReturnValueOnce([{ name: "Test" }]);
    mockSelectResult.mockReturnValueOnce([{
      nwc_url_encrypted: "enc_nostr+walletconnect://test",
    }]);
    mockMakeInvoice.mockRejectedValue(new Error("NWC error"));

    const req = createRequest("POST", "/api/payments/invoice", {
      completion_id: UUID.completion1,
      amount_sats: 50,
    });
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(500);
    expect(mockClose).toHaveBeenCalled();
  });
});
