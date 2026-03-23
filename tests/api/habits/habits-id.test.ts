// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, UUID } from "../../helpers";

const mockSelectResult = vi.fn();
const mockUpdateReturning = vi.fn();
const mockDeleteInsert = vi.fn();

const chainable = () => {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.from = self; chain.where = self; chain.leftJoin = self; chain.innerJoin = self;
  chain.orderBy = self; chain.limit = self;
  chain.then = (r: (v: unknown) => void) => r(mockSelectResult());
  return chain;
};

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: () => chainable(),
    insert: () => ({ values: mockDeleteInsert }),
    update: () => ({ set: () => ({ where: () => ({ returning: mockUpdateReturning }) }) }),
    delete: () => ({ where: vi.fn(async () => {}) }),
  }),
  habits: { id: "id", created_by: "cb", family_id: "fid" },
  habitAssignments: { habit_id: "hid" },
  familyMembers: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), or: vi.fn(), isNotNull: vi.fn(),
}));

import { PUT, DELETE } from "@/app/api/habits/[id]/route";

const routeCtx = { params: Promise.resolve({ id: UUID.habit1 }) };

describe("/api/habits/[id]", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
  });

  describe("PUT", () => {
    it("returns 401 without session", async () => {
      const req = createRequest("PUT", `/api/habits/${UUID.habit1}`, { name: "New" });
      const { status } = await parseResponse(await PUT(req, routeCtx));
      expect(status).toBe(401);
    });

    it("returns 404 when habit not found or not owner", async () => {
      await setSessionCookie(testSession);
      mockSelectResult.mockReturnValue([]);
      const req = createRequest("PUT", `/api/habits/${UUID.habit1}`, { name: "New" });
      const { status } = await parseResponse(await PUT(req, routeCtx));
      expect(status).toBe(404);
    });

    it("updates habit successfully", async () => {
      await setSessionCookie(testSession);
      mockSelectResult.mockReturnValue([{ id: UUID.habit1 }]);
      mockUpdateReturning.mockResolvedValue([{ id: UUID.habit1, name: "Updated" }]);

      const req = createRequest("PUT", `/api/habits/${UUID.habit1}`, { name: "Updated" });
      const { status, body } = await parseResponse(await PUT(req, routeCtx));
      expect(status).toBe(200);
      expect(body.data.name).toBe("Updated");
    });
  });

  describe("DELETE", () => {
    it("returns 404 when habit not found", async () => {
      await setSessionCookie(testSession);
      mockSelectResult.mockReturnValue([]);
      const req = createRequest("DELETE", `/api/habits/${UUID.habit1}`);
      const { status } = await parseResponse(await DELETE(req, routeCtx));
      expect(status).toBe(404);
    });

    it("soft-deletes habit (sets active=false)", async () => {
      await setSessionCookie(testSession);
      mockSelectResult.mockReturnValue([{ id: UUID.habit1 }]);
      const req = createRequest("DELETE", `/api/habits/${UUID.habit1}`);
      const { status, body } = await parseResponse(await DELETE(req, routeCtx));
      expect(status).toBe(200);
      expect(body.success).toBe(true);
    });
  });
});
