// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, UUID } from "../helpers";

const mockSelectResult = vi.fn();
const mockUpdateReturning = vi.fn();

const chainable = () => {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.from = self; chain.where = self; chain.innerJoin = self; chain.leftJoin = self;
  chain.orderBy = self; chain.limit = self;
  chain.then = (r: (v: unknown) => void) => r(mockSelectResult());
  return chain;
};

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: () => chainable(),
    update: () => ({ set: () => ({ where: () => ({ returning: mockUpdateReturning }) }) }),
  }),
  payments: { id: "id", completion_id: "ci", from_user_id: "fu", to_user_id: "tu", status: "s", created_at: "ca", amount_sats: "as" },
  completions: { id: "id", habit_id: "h" },
  habits: { id: "id", name: "n" },
  users: { id: "id", display_name: "dn" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), or: vi.fn(), gte: vi.fn(), lte: vi.fn(), desc: vi.fn(),
  sql: Object.assign(vi.fn((s: unknown) => s), { raw: vi.fn() }),
}));

import { GET } from "@/app/api/payments/route";
import { POST as retryPayment } from "@/app/api/payments/retry/route";

describe("GET /api/payments", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
  });

  it("returns 401 without session", async () => {
    const req = createRequest("GET", "/api/payments");
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(401);
  });

  it("returns payments for sponsor role", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValue([
      { id: UUID.payment1, amount_sats: 100, status: "paid", habit_name: "Read", other_user_display_name: "Kid" },
    ]);
    const req = createRequest("GET", "/api/payments", undefined, { role: "sponsor" });
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(body.data).toHaveLength(1);
  });
});

describe("POST /api/payments/retry", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
  });

  it("returns 400 without payment_id", async () => {
    await setSessionCookie(testSession);
    const req = createRequest("POST", "/api/payments/retry", {});
    const { status } = await parseResponse(await retryPayment(req));
    expect(status).toBe(400);
  });

  it("returns 404 when payment not found", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValue([]);
    const req = createRequest("POST", "/api/payments/retry", { payment_id: UUID.payment1 });
    const { status } = await parseResponse(await retryPayment(req));
    expect(status).toBe(404);
  });

  it("returns 400 when payment is not failed", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValue([{ id: UUID.payment1, status: "paid" }]);
    const req = createRequest("POST", "/api/payments/retry", { payment_id: UUID.payment1 });
    const { status } = await parseResponse(await retryPayment(req));
    expect(status).toBe(400);
  });

  it("retries failed payment", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValue([{ id: UUID.payment1, status: "failed" }]);
    mockUpdateReturning.mockResolvedValue([{ id: UUID.payment1, status: "pending" }]);
    const req = createRequest("POST", "/api/payments/retry", { payment_id: UUID.payment1 });
    const { status, body } = await parseResponse(await retryPayment(req));
    expect(status).toBe(200);
    expect(body.data.status).toBe("pending");
  });
});
