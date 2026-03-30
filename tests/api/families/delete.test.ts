// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, kidSession, UUID } from "../../helpers";

const mockSelectResult = vi.fn();
const mockDeleteWhere = vi.fn(async () => {});
const mockUpdateSet = vi.fn(() => ({ where: vi.fn(async () => {}) }));

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
    update: () => ({ set: mockUpdateSet }),
    delete: () => ({ where: mockDeleteWhere }),
  }),
  families: { id: "id", created_by: "cb" },
  familyMembers: { family_id: "fid", user_id: "uid" },
  habits: { family_id: "fid", active: "a" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(),
}));

import { DELETE } from "@/app/api/families/[id]/route";

const routeCtx = { params: Promise.resolve({ id: UUID.family1 }) };

describe("DELETE /api/families/[id]", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
  });

  it("returns 401 without session", async () => {
    const req = createRequest("DELETE", `/api/families/${UUID.family1}`);
    const { status } = await parseResponse(await DELETE(req, routeCtx));
    expect(status).toBe(401);
  });

  it("returns 404 when family not found", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValue([]);

    const req = createRequest("DELETE", `/api/families/${UUID.family1}`);
    const { status } = await parseResponse(await DELETE(req, routeCtx));
    expect(status).toBe(404);
  });

  it("returns 403 when user is not the creator", async () => {
    await setSessionCookie(kidSession);
    mockSelectResult.mockReturnValue([{ id: UUID.family1, created_by: UUID.user1 }]);

    const req = createRequest("DELETE", `/api/families/${UUID.family1}`);
    const { status } = await parseResponse(await DELETE(req, routeCtx));
    expect(status).toBe(403);
  });

  it("deletes family, deactivates habits, and removes members", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValue([{ id: UUID.family1, created_by: testSession.user_id }]);

    const req = createRequest("DELETE", `/api/families/${UUID.family1}`);
    const { status, body } = await parseResponse(await DELETE(req, routeCtx));
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    // Verify cascading operations were called
    expect(mockUpdateSet).toHaveBeenCalled(); // deactivate habits
    expect(mockDeleteWhere).toHaveBeenCalledTimes(2); // remove members + delete family
  });
});
