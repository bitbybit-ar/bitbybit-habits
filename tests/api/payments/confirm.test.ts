// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, kidSession, UUID } from "../../helpers";
import { createHash } from "crypto";

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
        return {
          where: () => ({
            returning: () => Promise.resolve([{ id: UUID.payment1 }]),
          }),
        };
      },
    }),
  }),
  payments: { id: "id", from_user_id: "f", status: "s", payment_hash: "ph", preimage: "pi", payment_method: "pm", paid_at: "pa" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
}));

import { POST } from "@/app/api/payments/[id]/confirm/route";

const routeCtx = { params: Promise.resolve({ id: UUID.payment1 }) };

// Helper: generate a valid preimage/hash pair
const validPreimage = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const validHash = createHash("sha256").update(Buffer.from(validPreimage, "hex")).digest("hex");

describe("POST /api/payments/[id]/confirm", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
  });

  it("returns 401 when not authenticated", async () => {
    const req = createRequest("POST", `/api/payments/${UUID.payment1}/confirm`, { preimage: validPreimage });
    const { status } = await parseResponse(await POST(req, routeCtx));
    expect(status).toBe(401);
  });

  it("returns 403 when kid tries to confirm", async () => {
    await setSessionCookie(kidSession);
    const req = createRequest("POST", `/api/payments/${UUID.payment1}/confirm`, { preimage: validPreimage });
    const { status } = await parseResponse(await POST(req, routeCtx));
    expect(status).toBe(403);
  });

  it("returns 400 when preimage is missing", async () => {
    await setSessionCookie(testSession);
    const req = createRequest("POST", `/api/payments/${UUID.payment1}/confirm`, {});
    const { status } = await parseResponse(await POST(req, routeCtx));
    expect(status).toBe(400);
  });

  it("returns 404 when payment not found", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValueOnce([]);
    const req = createRequest("POST", `/api/payments/${UUID.payment1}/confirm`, { preimage: validPreimage });
    const { status } = await parseResponse(await POST(req, routeCtx));
    expect(status).toBe(404);
  });

  it("returns already_paid for paid payment (idempotent)", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.payment1,
      from_user_id: testSession.user_id,
      status: "paid",
      payment_hash: validHash,
    }]);
    const req = createRequest("POST", `/api/payments/${UUID.payment1}/confirm`, { preimage: validPreimage });
    const { status, body } = await parseResponse(await POST(req, routeCtx));
    expect(status).toBe(200);
    expect(body.data.confirmed).toBe(true);
    expect(body.data.already_paid).toBe(true);
    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  it("confirms payment with valid preimage", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.payment1,
      from_user_id: testSession.user_id,
      status: "pending",
      payment_hash: validHash,
    }]);
    const req = createRequest("POST", `/api/payments/${UUID.payment1}/confirm`, { preimage: validPreimage });
    const { status, body } = await parseResponse(await POST(req, routeCtx));
    expect(status).toBe(200);
    expect(body.data.confirmed).toBe(true);
    expect(mockUpdateSet).toHaveBeenCalledWith(expect.objectContaining({
      status: "paid",
      preimage: validPreimage,
      payment_method: "webln",
    }));
  });

  it("rejects invalid preimage", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.payment1,
      from_user_id: testSession.user_id,
      status: "pending",
      payment_hash: validHash,
    }]);
    const invalidPreimage = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    const req = createRequest("POST", `/api/payments/${UUID.payment1}/confirm`, { preimage: invalidPreimage });
    const { status, body } = await parseResponse(await POST(req, routeCtx));
    expect(status).toBe(400);
    expect(body.error).toContain("invalid_preimage");
    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  it("returns 403 when sponsor is not the payer", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValueOnce([{
      id: UUID.payment1,
      from_user_id: "other-user-id",
      status: "pending",
      payment_hash: validHash,
    }]);
    const req = createRequest("POST", `/api/payments/${UUID.payment1}/confirm`, { preimage: validPreimage });
    const { status } = await parseResponse(await POST(req, routeCtx));
    expect(status).toBe(403);
  });
});
