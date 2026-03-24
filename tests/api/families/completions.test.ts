// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, kidSession, UUID } from "../../helpers";

let selectCallCount = 0;
const selectResults: unknown[][] = [];

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
  }),
  families: { id: "id" },
  familyMembers: { family_id: "f", user_id: "u", role: "r" },
  completions: { id: "id", habit_id: "h", status: "s", user_id: "u", date: "d" },
  habits: { id: "id", family_id: "f", name: "n", sat_reward: "sr", active: "a" },
  users: { id: "id", display_name: "dn" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), gte: vi.fn(), desc: vi.fn(),
  sql: Object.assign(vi.fn(() => "NOW()"), { raw: vi.fn() }),
}));

import { GET } from "@/app/api/families/[id]/completions/route";

const routeCtx = { params: Promise.resolve({ id: UUID.family1 }) };

describe("GET /api/families/[id]/completions", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    selectCallCount = 0;
    selectResults.length = 0;
    await clearSessionCookie();
  });

  it("returns 401 without session", async () => {
    const req = createRequest("GET", `/api/families/${UUID.family1}/completions`);
    const { status } = await parseResponse(await GET(req, routeCtx));
    expect(status).toBe(401);
  });

  it("returns 404 when family does not exist", async () => {
    await setSessionCookie(testSession);
    selectResults.push([]); // family not found
    const req = createRequest("GET", `/api/families/${UUID.family1}/completions`);
    const { status } = await parseResponse(await GET(req, routeCtx));
    expect(status).toBe(404);
  });

  it("returns 403 when user is not a sponsor", async () => {
    await setSessionCookie(kidSession);
    selectResults.push([{ id: UUID.family1 }]); // family exists
    selectResults.push([{ role: "kid" }]); // membership is kid
    const req = createRequest("GET", `/api/families/${UUID.family1}/completions`);
    const { status } = await parseResponse(await GET(req, routeCtx));
    expect(status).toBe(403);
  });

  it("returns 403 when user is not a member", async () => {
    await setSessionCookie(testSession);
    selectResults.push([{ id: UUID.family1 }]); // family exists
    selectResults.push([]); // no membership
    const req = createRequest("GET", `/api/families/${UUID.family1}/completions`);
    const { status } = await parseResponse(await GET(req, routeCtx));
    expect(status).toBe(403);
  });

  it("returns completions for the family", async () => {
    await setSessionCookie(testSession);
    selectResults.push([{ id: UUID.family1 }]); // family exists
    selectResults.push([{ role: "sponsor" }]); // sponsor membership
    const mockCompletions = [
      {
        id: UUID.completion1,
        habit_id: UUID.habit1,
        habit_name: "Make the bed",
        kid_user_id: UUID.user2,
        kid_display_name: "Kid User",
        date: "2026-03-24",
        status: "pending",
        sat_reward: 50,
      },
    ];
    selectResults.push(mockCompletions); // completions query

    const req = createRequest("GET", `/api/families/${UUID.family1}/completions`);
    const { status, body } = await parseResponse(await GET(req, routeCtx));
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].habit_name).toBe("Make the bed");
    expect(body.data[0].sat_reward).toBe(50);
  });

  it("returns empty array when no completions", async () => {
    await setSessionCookie(testSession);
    selectResults.push([{ id: UUID.family1 }]); // family exists
    selectResults.push([{ role: "sponsor" }]); // sponsor membership
    selectResults.push([]); // no completions

    const req = createRequest("GET", `/api/families/${UUID.family1}/completions`);
    const { status, body } = await parseResponse(await GET(req, routeCtx));
    expect(status).toBe(200);
    expect(body.data).toHaveLength(0);
  });
});
