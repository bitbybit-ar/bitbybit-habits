// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, kidSession, UUID } from "../../helpers";

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

  it("returns 404 when payment not found", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValueOnce([]);
    const req = createRequest("POST", "/api/payments/retry", { payment_id: UUID.payment1 });
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(404);
  });

  it("returns 404 when kid tries to retry (ownership mismatch)", async () => {
    await setSessionCookie(kidSession);
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
    }]);
    const req = createRequest("POST", "/api/payments/retry", { payment_id: UUID.payment1 });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(body.error).toContain("only_failed_retry");
  });

  it("resets failed payment to pending and returns it", async () => {
    await setSessionCookie(testSession);
    // First select: find failed payment
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.payment1,
      from_user_id: testSession.user_id,
      status: "failed",
      completion_id: UUID.completion1,
      amount_sats: 100,
      payment_request: "lnbc...",
    }]);
    // Second select: return updated payment
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.payment1,
      from_user_id: testSession.user_id,
      status: "pending",
      completion_id: UUID.completion1,
      amount_sats: 100,
      payment_request: null,
    }]);

    const req = createRequest("POST", "/api/payments/retry", { payment_id: UUID.payment1 });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(body.data.status).toBe("pending");
    // Verify old invoice data was cleared
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({
      status: "pending",
      payment_request: null,
      payment_hash: null,
      preimage: null,
      payment_method: null,
      paid_at: null,
    }));
  });
});
