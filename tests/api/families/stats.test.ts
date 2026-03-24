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
  payments: { id: "id", completion_id: "c", amount_sats: "as", status: "s" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), count: vi.fn(), sum: vi.fn(),
  sql: Object.assign(vi.fn(() => "COALESCE"), { raw: vi.fn() }),
}));

import { GET } from "@/app/api/families/[id]/stats/route";

const routeCtx = { params: Promise.resolve({ id: UUID.family1 }) };

describe("GET /api/families/[id]/stats", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    selectCallCount = 0;
    selectResults.length = 0;
    await clearSessionCookie();
  });

  it("returns 401 without session", async () => {
    const req = createRequest("GET", `/api/families/${UUID.family1}/stats`);
    const { status } = await parseResponse(await GET(req, routeCtx));
    expect(status).toBe(401);
  });

  it("returns 404 when family does not exist", async () => {
    await setSessionCookie(testSession);
    selectResults.push([]); // family not found
    const req = createRequest("GET", `/api/families/${UUID.family1}/stats`);
    const { status } = await parseResponse(await GET(req, routeCtx));
    expect(status).toBe(404);
  });

  it("returns 403 when user is not a sponsor", async () => {
    await setSessionCookie(kidSession);
    selectResults.push([{ id: UUID.family1 }]); // family exists
    selectResults.push([{ role: "kid" }]); // kid role
    const req = createRequest("GET", `/api/families/${UUID.family1}/stats`);
    const { status } = await parseResponse(await GET(req, routeCtx));
    expect(status).toBe(403);
  });

  it("returns stats for the family", async () => {
    await setSessionCookie(testSession);
    selectResults.push([{ id: UUID.family1 }]); // family exists
    selectResults.push([{ role: "sponsor" }]); // sponsor membership

    // The 4 parallel stats queries
    selectResults.push([{ count: 3 }]); // completedToday
    selectResults.push([{ count: 5 }]); // totalToday
    selectResults.push([{ count: 2 }]); // pendingApprovals
    selectResults.push([{ total: 1500 }]); // totalSatsPaid

    const req = createRequest("GET", `/api/families/${UUID.family1}/stats`);
    const { status, body } = await parseResponse(await GET(req, routeCtx));
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({
      completedToday: 3,
      totalToday: 5,
      pendingApprovals: 2,
      totalSatsPaid: 1500,
    });
  });

  it("returns zeros when no data", async () => {
    await setSessionCookie(testSession);
    selectResults.push([{ id: UUID.family1 }]); // family exists
    selectResults.push([{ role: "sponsor" }]); // sponsor membership

    selectResults.push([{ count: 0 }]);
    selectResults.push([{ count: 0 }]);
    selectResults.push([{ count: 0 }]);
    selectResults.push([{ total: 0 }]);

    const req = createRequest("GET", `/api/families/${UUID.family1}/stats`);
    const { status, body } = await parseResponse(await GET(req, routeCtx));
    expect(status).toBe(200);
    expect(body.data).toEqual({
      completedToday: 0,
      totalToday: 0,
      pendingApprovals: 0,
      totalSatsPaid: 0,
    });
  });
});
