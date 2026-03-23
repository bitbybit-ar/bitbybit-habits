// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, UUID } from "../helpers";

let selectCallCount = 0;
const selectResults: unknown[][] = [];

const chainable = () => {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.from = self; chain.where = self; chain.innerJoin = self;
  chain.orderBy = self; chain.limit = self;
  chain.then = (r: (v: unknown) => void) => r(selectResults[selectCallCount++] ?? []);
  return chain;
};

vi.mock("@/lib/db", () => ({
  getDb: () => ({ select: () => chainable() }),
  payments: { to_user_id: "tu", status: "s", amount_sats: "as" },
  completions: { user_id: "u", status: "s", habit_id: "h", date: "d" },
  habits: { assigned_to: "at", active: "a", id: "id", name: "n" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), sum: vi.fn(), count: vi.fn(), desc: vi.fn(), inArray: vi.fn(),
  sql: Object.assign(vi.fn((v: unknown) => v), { raw: vi.fn() }),
}));

import { GET } from "@/app/api/stats/route";

describe("GET /api/stats", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    selectCallCount = 0;
    selectResults.length = 0;
    await clearSessionCookie();
  });

  it("returns 401 without session", async () => {
    const req = createRequest("GET", "/api/stats");
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(401);
  });

  it("returns stats with streaks", async () => {
    await setSessionCookie(testSession);
    selectResults.push([{ total: 500 }]); // sats
    selectResults.push([{ pending_count: 2 }]); // pending
    selectResults.push([{ id: UUID.habit1, name: "Read" }]); // active habits
    // Completions for streak calc - 3 consecutive days (now batched with habit_id)
    const today = new Date();
    const dates = [0, 1, 2].map(d => {
      const dt = new Date(today);
      dt.setDate(dt.getDate() - d);
      return { habit_id: UUID.habit1, date: dt.toISOString().split("T")[0] };
    });
    selectResults.push(dates);

    const req = createRequest("GET", "/api/stats");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(body.data.total_sats_earned).toBe(500);
    expect(body.data.pending_completions).toBe(2);
    expect(body.data.streaks).toHaveLength(1);
    expect(body.data.streaks[0].current_streak).toBeGreaterThanOrEqual(1);
  });
});
