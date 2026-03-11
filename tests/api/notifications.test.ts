import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, UUID } from "../helpers";

const mockSelectResult = vi.fn();

const chainable = () => {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.from = self; chain.where = self; chain.orderBy = self; chain.limit = self;
  chain.then = (r: (v: unknown) => void) => r(mockSelectResult());
  return chain;
};

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: () => chainable(),
    update: () => ({ set: () => ({ where: vi.fn(async () => {}) }) }),
  }),
  notifications: { user_id: "u", read: "r", created_at: "ca", id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), desc: vi.fn(),
}));

import { GET, PATCH } from "@/app/api/notifications/route";

describe("/api/notifications", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
  });

  describe("GET", () => {
    it("returns 401 without session", async () => {
      const req = createRequest("GET", "/api/notifications");
      const { status } = await parseResponse(await GET(req));
      expect(status).toBe(401);
    });

    it("returns notifications", async () => {
      await setSessionCookie(testSession);
      mockSelectResult.mockReturnValue([
        { id: UUID.notification1, type: "completion_approved", title: "Approved!", body: "Test", read: false },
      ]);
      const req = createRequest("GET", "/api/notifications");
      const { status, body } = await parseResponse(await GET(req));
      expect(status).toBe(200);
      expect(body.data).toHaveLength(1);
    });

    it("filters unread only", async () => {
      await setSessionCookie(testSession);
      mockSelectResult.mockReturnValue([]);
      const req = createRequest("GET", "/api/notifications", undefined, { unread: "true" });
      const { status } = await parseResponse(await GET(req));
      expect(status).toBe(200);
    });
  });

  describe("PATCH", () => {
    it("returns 400 without id", async () => {
      await setSessionCookie(testSession);
      const req = createRequest("PATCH", "/api/notifications", {});
      const { status } = await parseResponse(await PATCH(req));
      expect(status).toBe(400);
    });

    it("marks notification as read", async () => {
      await setSessionCookie(testSession);
      const req = createRequest("PATCH", "/api/notifications", { id: UUID.notification1 });
      const { status, body } = await parseResponse(await PATCH(req));
      expect(status).toBe(200);
      expect(body.success).toBe(true);
    });
  });
});
