// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, UUID } from "../../helpers";

let selectCallCount = 0;
const selectResults: unknown[][] = [];
const mockInsertReturning = vi.fn();

const chainable = () => {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.from = self; chain.where = self; chain.leftJoin = self; chain.innerJoin = self;
  chain.orderBy = self; chain.limit = self;
  chain.then = (r: (v: unknown) => void) => r(selectResults[selectCallCount++] ?? []);
  return chain;
};

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: () => chainable(),
    selectDistinct: () => chainable(),
    insert: () => ({ values: () => ({ returning: mockInsertReturning }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: vi.fn(async () => []) }) }) }),
    delete: () => ({ where: vi.fn(async () => {}) }),
  }),
  users: {}, families: {}, familyMembers: { id: "id" },
  habits: { id: "id", family_id: "fid", assigned_to: "at", active: "a", verification_type: "vt" },
  completions: { id: "id", habit_id: "h", user_id: "u", date: "d", status: "s", completed_at: "ca" },
  payments: {}, wallets: {}, notifications: {}, habitAssignments: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), or: vi.fn(), and: vi.fn(), isNull: vi.fn(), isNotNull: vi.fn(),
  desc: vi.fn(), gte: vi.fn(), lte: vi.fn(), sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(),
}));

import { POST, GET } from "@/app/api/completions/route";

describe("/api/completions", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    selectCallCount = 0;
    selectResults.length = 0;
    await clearSessionCookie();
  });

  describe("POST", () => {
    it("returns 401 without session", async () => {
      const req = createRequest("POST", "/api/completions", { habit_id: UUID.habit1 });
      const { status } = await parseResponse(await POST(req));
      expect(status).toBe(401);
    });

    it("returns 400 when habit_id is missing", async () => {
      await setSessionCookie(testSession);
      const req = createRequest("POST", "/api/completions", {});
      const { status } = await parseResponse(await POST(req));
      expect(status).toBe(400);
    });

    it("returns 404 when habit not found", async () => {
      await setSessionCookie(testSession);
      selectResults.push([]); // habit query
      const req = createRequest("POST", "/api/completions", { habit_id: UUID.habit1 });
      const { status } = await parseResponse(await POST(req));
      expect(status).toBe(404);
    });

    it("returns 409 when already completed today", async () => {
      await setSessionCookie(testSession);
      selectResults.push([{ habits: { id: UUID.habit1, verification_type: "self_verify", family_id: null } }]); // habit found
      selectResults.push([{ id: UUID.completion1 }]); // existing completion
      const req = createRequest("POST", "/api/completions", { habit_id: UUID.habit1 });
      const { status } = await parseResponse(await POST(req));
      expect(status).toBe(409);
    });

    it("creates completion with self_verify status=approved", async () => {
      await setSessionCookie(testSession);
      selectResults.push([{ habits: { id: UUID.habit1, verification_type: "self_verify", family_id: null } }]);
      selectResults.push([]); // no existing completion
      mockInsertReturning.mockResolvedValue([{
        id: UUID.completion1, habit_id: UUID.habit1, status: "approved",
      }]);

      const req = createRequest("POST", "/api/completions", { habit_id: UUID.habit1 });
      const { status, body } = await parseResponse(await POST(req));
      expect(status).toBe(201);
      expect(body.data.status).toBe("approved");
    });

    it("creates completion with sponsor_approval status=pending", async () => {
      await setSessionCookie(testSession);
      selectResults.push([{ habits: { id: UUID.habit1, verification_type: "sponsor_approval", family_id: UUID.family1 } }]);
      selectResults.push([]); // no existing
      selectResults.push([]); // sponsors query (for notifications)
      mockInsertReturning.mockResolvedValue([{
        id: UUID.completion1, habit_id: UUID.habit1, status: "pending",
      }]);

      const req = createRequest("POST", "/api/completions", { habit_id: UUID.habit1 });
      const { status, body } = await parseResponse(await POST(req));
      expect(status).toBe(201);
      expect(body.data.status).toBe("pending");
    });
  });

  describe("GET", () => {
    it("returns 401 without session", async () => {
      const req = createRequest("GET", "/api/completions");
      const { status } = await parseResponse(await GET(req));
      expect(status).toBe(401);
    });

    it("returns completions list", async () => {
      await setSessionCookie(testSession);
      selectResults.push([
        { id: UUID.completion1, habit_id: UUID.habit1, status: "approved", date: "2026-03-11" },
      ]);

      const req = createRequest("GET", "/api/completions");
      const { status, body } = await parseResponse(await GET(req));
      expect(status).toBe(200);
      expect(body.data).toHaveLength(1);
    });
  });
});
