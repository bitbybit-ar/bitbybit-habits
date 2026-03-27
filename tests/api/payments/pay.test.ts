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
  payments: { id: "id", from_user_id: "f", status: "s", payment_request: "pr", payment_hash: "ph", paid_at: "pa", preimage: "pi", payment_method: "pm" },
  wallets: { user_id: "u", active: "a", nwc_url_encrypted: "nwc" },
}));

vi.mock("@/lib/crypto", () => ({
  decrypt: vi.fn((s: string) => s.replace("enc_", "")),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(),
}));

import { POST } from "@/app/api/payments/[id]/pay/route";

const routeCtx = { params: Promise.resolve({ id: UUID.payment1 }) };

describe("POST /api/payments/[id]/pay", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
  });

  it("returns 401 when not authenticated", async () => {
    const req = createRequest("POST", `/api/payments/${UUID.payment1}/pay`);
    const { status } = await parseResponse(await POST(req, routeCtx));
    expect(status).toBe(401);
  });

  it("returns 403 when kid tries to pay", async () => {
    await setSessionCookie(kidSession);
    const req = createRequest("POST", `/api/payments/${UUID.payment1}/pay`);
    const { status } = await parseResponse(await POST(req, routeCtx));
    expect(status).toBe(403);
  });

  it("returns 404 when payment not found", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValueOnce([]);
    const req = createRequest("POST", `/api/payments/${UUID.payment1}/pay`);
    const { status } = await parseResponse(await POST(req, routeCtx));
    expect(status).toBe(404);
  });

  it("returns already_paid for paid payment", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.payment1,
      from_user_id: testSession.user_id,
      status: "paid",
      payment_request: "lnbc...",
      payment_hash: "abc",
    }]);
    const req = createRequest("POST", `/api/payments/${UUID.payment1}/pay`);
    const { status, body } = await parseResponse(await POST(req, routeCtx));
    expect(status).toBe(200);
    expect(body.data.already_paid).toBe(true);
  });

  it("returns 400 when sponsor has no wallet", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.payment1,
      from_user_id: testSession.user_id,
      status: "pending",
      payment_request: "lnbc...",
      payment_hash: "abc",
    }]);
    mockSelectResult.mockReturnValueOnce([]); // no wallet
    const req = createRequest("POST", `/api/payments/${UUID.payment1}/pay`);
    const { status, body } = await parseResponse(await POST(req, routeCtx));
    expect(status).toBe(400);
    expect(body.error).toContain("sponsor_no_wallet");
  });

  it("pays invoice successfully", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.payment1,
      from_user_id: testSession.user_id,
      status: "pending",
      payment_request: "lnbc500n1...",
      payment_hash: "abc123",
    }]);
    mockSelectResult.mockReturnValueOnce([{
      nwc_url_encrypted: "enc_nostr+walletconnect://test",
    }]);
    mockPayInvoice.mockResolvedValue({
      preimage: "preimage123",
      payment_hash: "abc123",
    });

    const req = createRequest("POST", `/api/payments/${UUID.payment1}/pay`);
    const { status, body } = await parseResponse(await POST(req, routeCtx));
    expect(status).toBe(200);
    expect(body.data.paid).toBe(true);
    expect(body.data.preimage).toBe("preimage123");
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({
      status: "paid",
      preimage: "preimage123",
      payment_method: "nwc",
    }));
    expect(mockClose).toHaveBeenCalled();
  });

  it("marks payment as failed on NWC error", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.payment1,
      from_user_id: testSession.user_id,
      status: "pending",
      payment_request: "lnbc500n1...",
      payment_hash: "abc123",
    }]);
    mockSelectResult.mockReturnValueOnce([{
      nwc_url_encrypted: "enc_nostr+walletconnect://test",
    }]);
    mockPayInvoice.mockRejectedValue(new Error("Insufficient balance"));

    const req = createRequest("POST", `/api/payments/${UUID.payment1}/pay`);
    const { status, body } = await parseResponse(await POST(req, routeCtx));
    expect(status).toBe(400);
    expect(body.error).toContain("Insufficient balance");
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "failed" }));
    expect(mockClose).toHaveBeenCalled();
  });
});
