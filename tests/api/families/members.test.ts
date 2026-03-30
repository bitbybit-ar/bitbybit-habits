// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, kidSession, UUID } from "../../helpers";

let selectCallCount = 0;
const selectResults: unknown[][] = [];
const mockDeleteWhere = vi.fn(async () => {});

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
    delete: () => ({ where: mockDeleteWhere }),
  }),
  familyMembers: { family_id: "fid", user_id: "uid", role: "r" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(),
}));

import { DELETE } from "@/app/api/families/[id]/members/[userId]/route";

const routeCtx = { params: Promise.resolve({ id: UUID.family1, userId: UUID.user2 }) };
const selfRemoveCtx = { params: Promise.resolve({ id: UUID.family1, userId: testSession.user_id }) };

describe("DELETE /api/families/[id]/members/[userId]", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    selectCallCount = 0;
    selectResults.length = 0;
    await clearSessionCookie();
  });

  it("returns 401 without session", async () => {
    const req = createRequest("DELETE", `/api/families/${UUID.family1}/members/${UUID.user2}`);
    const { status } = await parseResponse(await DELETE(req, routeCtx));
    expect(status).toBe(401);
  });

  it("returns 403 when requester is not a sponsor", async () => {
    await setSessionCookie(kidSession);
    // Requester membership: kid role
    selectResults.push([{ role: "kid" }]);

    const req = createRequest("DELETE", `/api/families/${UUID.family1}/members/${UUID.user2}`);
    const { status } = await parseResponse(await DELETE(req, routeCtx));
    expect(status).toBe(403);
  });

  it("returns 403 when requester is not a member", async () => {
    await setSessionCookie(testSession);
    // Requester not found in family
    selectResults.push([]);

    const req = createRequest("DELETE", `/api/families/${UUID.family1}/members/${UUID.user2}`);
    const { status } = await parseResponse(await DELETE(req, routeCtx));
    expect(status).toBe(403);
  });

  it("returns 403 when trying to remove yourself", async () => {
    await setSessionCookie(testSession);
    // Requester is sponsor
    selectResults.push([{ role: "sponsor" }]);

    const req = createRequest("DELETE", `/api/families/${UUID.family1}/members/${testSession.user_id}`);
    const { status } = await parseResponse(await DELETE(req, selfRemoveCtx));
    expect(status).toBe(403);
  });

  it("returns 404 when target user is not a member", async () => {
    await setSessionCookie(testSession);
    // Requester is sponsor
    selectResults.push([{ role: "sponsor" }]);
    // Target not in family
    selectResults.push([]);

    const req = createRequest("DELETE", `/api/families/${UUID.family1}/members/${UUID.user2}`);
    const { status } = await parseResponse(await DELETE(req, routeCtx));
    expect(status).toBe(404);
  });

  it("removes member successfully", async () => {
    await setSessionCookie(testSession);
    // Requester is sponsor
    selectResults.push([{ role: "sponsor" }]);
    // Target is a kid member
    selectResults.push([{ role: "kid" }]);

    const req = createRequest("DELETE", `/api/families/${UUID.family1}/members/${UUID.user2}`);
    const { status, body } = await parseResponse(await DELETE(req, routeCtx));
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockDeleteWhere).toHaveBeenCalled();
  });
});
