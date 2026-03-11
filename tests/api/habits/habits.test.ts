import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, UUID } from "../../helpers";

const mockSelectResult = vi.fn();
const mockInsertReturning = vi.fn();

const chainableSelect = () => {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.from = self; chain.where = self; chain.leftJoin = self; chain.innerJoin = self;
  chain.orderBy = self; chain.limit = self; chain.groupBy = self;
  chain.then = (r: (v: unknown) => void) => r(mockSelectResult());
  return chain;
};

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: () => chainableSelect(),
    selectDistinct: () => chainableSelect(),
    insert: () => ({ values: () => ({ returning: mockInsertReturning }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: vi.fn(async () => []) }) }) }),
    delete: () => ({ where: vi.fn(async () => {}) }),
  }),
  users: {}, families: {}, familyMembers: { id: "id", family_id: "f", user_id: "u", role: "r" },
  habits: { id: "id", family_id: "f", created_by: "cb", assigned_to: "at", name: "n", active: "a", created_at: "ca" },
  completions: { id: "id", habit_id: "h" },
  payments: {}, wallets: {}, notifications: {}, habitAssignments: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), or: vi.fn(), and: vi.fn(), isNull: vi.fn(), isNotNull: vi.fn(),
  desc: vi.fn(), asc: vi.fn(), sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

import { GET, POST } from "@/app/api/habits/route";

describe("/api/habits", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
  });

  describe("GET", () => {
    it("returns 401 without session", async () => {
      const req = createRequest("GET", "/api/habits");
      const { status } = await parseResponse(await GET(req));
      expect(status).toBe(401);
    });

    it("returns habits list when authenticated", async () => {
      await setSessionCookie(testSession);
      mockSelectResult.mockReturnValue([
        { id: UUID.habit1, name: "Read", color: "#F7A825", active: true, completed_today: false },
      ]);

      const req = createRequest("GET", "/api/habits");
      const { status, body } = await parseResponse(await GET(req));
      expect(status).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe("Read");
    });
  });

  describe("POST", () => {
    it("returns 401 without session", async () => {
      const req = createRequest("POST", "/api/habits", { name: "Test" });
      const { status } = await parseResponse(await POST(req));
      expect(status).toBe(401);
    });

    it("returns 400 when required fields missing", async () => {
      await setSessionCookie(testSession);
      const req = createRequest("POST", "/api/habits", { name: "" });
      const { status, body } = await parseResponse(await POST(req));
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("creates a self-assigned habit", async () => {
      await setSessionCookie(testSession);
      mockInsertReturning.mockResolvedValue([{
        id: UUID.habit1, name: "Meditate", color: "#FF0000", sat_reward: 0,
        assigned_to: testSession.user_id, schedule_type: "daily", active: true,
      }]);

      const req = createRequest("POST", "/api/habits", {
        name: "Meditate", color: "#FF0000", schedule_type: "daily",
        verification_type: "self_verify", assigned_to: testSession.user_id,
      });
      const { status, body } = await parseResponse(await POST(req));
      expect(status).toBe(201);
      expect(body.data.name).toBe("Meditate");
    });

    it("returns 400 when assigning to others without family_id", async () => {
      await setSessionCookie(testSession);
      const req = createRequest("POST", "/api/habits", {
        name: "Homework", color: "#00FF00", schedule_type: "daily",
        verification_type: "sponsor_approval", assigned_to: UUID.user2,
      });
      const { status } = await parseResponse(await POST(req));
      expect(status).toBe(400);
    });

    it("returns 403 when user is not sponsor of family", async () => {
      await setSessionCookie(testSession);
      mockSelectResult.mockReturnValueOnce([]); // sponsorMembership = empty

      const req = createRequest("POST", "/api/habits", {
        name: "Homework", color: "#00FF00", schedule_type: "daily",
        verification_type: "sponsor_approval", assigned_to: UUID.user2, family_id: UUID.family1,
      });
      const { status } = await parseResponse(await POST(req));
      expect(status).toBe(403);
    });
  });
});
