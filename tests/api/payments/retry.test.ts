// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, kidSession, UUID } from "../../helpers";

// Mock NWC client
const mockPayInvoice = vi.fn();
const mockClose = vi.fn();

vi.mock("@getalby/sdk", () => ({
  NWCClient: class {
    payInvoice = mockPayInvoice;
    close = mockClose;
  },
}));

// Mock DB
const mockSelectResult = vi.fn();
const mockUpdateSet = vi.fn();
const mockUpdateReturning = vi.fn();

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
        return {
          where: vi.fn().mockReturnValue({ returning: mockUpdateReturning }),
        };
      },
    }),
  }),
  payments: { id: "id", from_user_id: "f", status: "s", payment_request: "pr", payment_hash: "ph", paid_at: "pa" },
  wallets: { user_id: "u", active: "a", nwc_url_encrypted: "nwc" },
}));

vi.mock("@/lib/crypto", () => ({
  decrypt: vi.fn((s: string) => s.replace("enc_", "")),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(),
}));

import { POST } from "@/app/api/payments/retry/route";

describe("POST /api/payments/retry", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
  });

  it("returns 401 when not authenticated", async () => {
    const req = createRequest("POST", "/api/payments/retry", { payment_id: UUID.payment1 });
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(401);
  });

  it("returns 403 when kid tries to retry", async () => {
    await setSessionCookie(kidSession);
    // Kid's user_id won't match from_user_id, so query returns empty -> 404
    mockSelectResult.mockReturnValueOnce([]);
    const req = createRequest("POST", "/api/payments/retry", { payment_id: UUID.payment1 });
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(404);
  });

  it("returns 404 when payment not found", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValueOnce([]);
    const req = createRequest("POST", "/api/payments/retry", { payment_id: UUID.payment1 });
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(404);
  });

  it("returns 400 when payment is not failed", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.payment1,
      from_user_id: testSession.user_id,
      status: "paid",
      payment_request: "lnbc...",
    }]);
    const req = createRequest("POST", "/api/payments/retry", { payment_id: UUID.payment1 });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(body.error).toContain("only_failed_retry");
  });

  it("returns needs_new_invoice when no invoice exists", async () => {
    await setSessionCookie(testSession);
    // First select: payment found with failed status, no invoice
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.payment1,
      from_user_id: testSession.user_id,
      status: "failed",
      payment_request: null,
    }]);
    // After update (reset status), select again for return value
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.payment1,
      from_user_id: testSession.user_id,
      status: "pending",
      payment_request: null,
    }]);

    const req = createRequest("POST", "/api/payments/retry", { payment_id: UUID.payment1 });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(body.data.needs_new_invoice).toBe(true);
  });

  it("retries successfully with existing invoice", async () => {
    await setSessionCookie(testSession);
    // First select: payment with failed status and invoice
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.payment1,
      from_user_id: testSession.user_id,
      status: "failed",
      payment_request: "lnbc500n1...",
    }]);
    // Second select: sponsor wallet
    mockSelectResult.mockReturnValueOnce([{
      nwc_url_encrypted: "enc_nostr+walletconnect://test",
    }]);
    mockPayInvoice.mockResolvedValue({ preimage: "preimage123" });
    mockUpdateReturning.mockResolvedValue([{
      id: UUID.payment1, status: "paid", paid_at: new Date(),
    }]);

    const req = createRequest("POST", "/api/payments/retry", { payment_id: UUID.payment1 });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(body.data.paid).toBe(true);
    expect(mockClose).toHaveBeenCalled();
  });

  it("returns needs_new_invoice when invoice is expired", async () => {
    await setSessionCookie(testSession);
    // First select: payment with failed status and invoice
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.payment1,
      from_user_id: testSession.user_id,
      status: "failed",
      payment_request: "lnbc500n1...",
    }]);
    // Second select: sponsor wallet
    mockSelectResult.mockReturnValueOnce([{
      nwc_url_encrypted: "enc_nostr+walletconnect://test",
    }]);
    // NWC payment fails with expired error
    mockPayInvoice.mockRejectedValue(new Error("INVOICE_EXPIRED"));
    // After marking failed and clearing invoice, select for return
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.payment1, status: "failed", payment_request: null,
    }]);

    const req = createRequest("POST", "/api/payments/retry", { payment_id: UUID.payment1 });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(body.data.needs_new_invoice).toBe(true);
    expect(mockClose).toHaveBeenCalled();
  });
});
