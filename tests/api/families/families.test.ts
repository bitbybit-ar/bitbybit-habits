import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, UUID } from "../../helpers";

let selectCallCount = 0;
const selectResults: unknown[][] = [];
const mockInsertReturning = vi.fn();

const chainable = () => {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.from = self; chain.where = self; chain.innerJoin = self; chain.leftJoin = self;
  chain.orderBy = self; chain.limit = self;
  chain.then = (r: (v: unknown) => void) => r(selectResults[selectCallCount++] ?? []);
  return chain;
};

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: () => chainable(),
    insert: () => ({ values: () => ({ returning: mockInsertReturning }) }),
    update: () => ({ set: () => ({ where: vi.fn(async () => {}) }) }),
    delete: () => ({ where: vi.fn(async () => {}) }),
  }),
  families: { id: "id", created_at: "ca", invite_code: "ic", created_by: "cb" },
  familyMembers: { family_id: "f", user_id: "u", role: "r", id: "id", joined_at: "ja" },
  users: { id: "id", display_name: "dn", username: "un", avatar_url: "au" },
  habits: { family_id: "f" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), or: vi.fn(), ne: vi.fn(), desc: vi.fn(), asc: vi.fn(),
}));

import { GET, POST } from "@/app/api/families/route";

describe("/api/families", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    selectCallCount = 0;
    selectResults.length = 0;
    await clearSessionCookie();
  });

  describe("GET", () => {
    it("returns 401 without session", async () => {
      const req = createRequest("GET", "/api/families");
      const { status } = await parseResponse(await GET(req));
      expect(status).toBe(401);
    });

    it("returns families with members", async () => {
      await setSessionCookie(testSession);
      selectResults.push([{ family: { id: UUID.family1, name: "Test Family", invite_code: "ABC123" } }]);
      selectResults.push([
        { id: "m1", role: "sponsor", user_id: UUID.user1, display_name: "Parent", username: "parent", avatar_url: null, joined_at: "2026-01-01" },
      ]);

      const req = createRequest("GET", "/api/families");
      const { status, body } = await parseResponse(await GET(req));
      expect(status).toBe(200);
      expect(body.data[0].name).toBe("Test Family");
      expect(body.data[0].members).toHaveLength(1);
    });
  });

  describe("POST", () => {
    it("returns 400 when name is empty", async () => {
      await setSessionCookie(testSession);
      const req = createRequest("POST", "/api/families", { name: "" });
      const { status } = await parseResponse(await POST(req));
      expect(status).toBe(400);
    });

    it("creates family and adds creator as sponsor", async () => {
      await setSessionCookie(testSession);
      mockInsertReturning
        .mockResolvedValueOnce([{ id: UUID.family1, name: "New Family", invite_code: "XYZ789" }]);

      const req = createRequest("POST", "/api/families", { name: "New Family" });
      const { status, body } = await parseResponse(await POST(req));
      expect(status).toBe(201);
      expect(body.data.name).toBe("New Family");
    });
  });
});
