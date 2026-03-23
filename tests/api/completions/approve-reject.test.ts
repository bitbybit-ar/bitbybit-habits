// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, UUID } from "../../helpers";

let selectCallCount = 0;
const selectResults: unknown[][] = [];
const mockUpdateReturning = vi.fn();
const mockInsertValues = vi.fn();

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
    insert: () => ({ values: mockInsertValues }),
    update: () => ({ set: () => ({ where: () => ({ returning: mockUpdateReturning }) }) }),
  }),
  completions: { id: "id", habit_id: "h", status: "s", user_id: "u" },
  habits: { id: "id", family_id: "f", sat_reward: "sr", assigned_to: "at", name: "n" },
  familyMembers: { family_id: "f", user_id: "u", role: "r" },
  payments: {},
  users: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), sql: Object.assign(vi.fn(() => "NOW()"), { raw: vi.fn() }),
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(),
}));

import { POST as approve } from "@/app/api/completions/approve/route";
import { POST as reject } from "@/app/api/completions/reject/route";

describe("/api/completions/approve", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    selectCallCount = 0;
    selectResults.length = 0;
    await clearSessionCookie();
  });

  it("returns 401 without session", async () => {
    const req = createRequest("POST", "/api/completions/approve", { completion_id: UUID.completion1 });
    const { status } = await parseResponse(await approve(req));
    expect(status).toBe(401);
  });

  it("returns 400 without completion_id", async () => {
    await setSessionCookie(testSession);
    const req = createRequest("POST", "/api/completions/approve", {});
    const { status } = await parseResponse(await approve(req));
    expect(status).toBe(400);
  });

  it("returns 404 when completion not found", async () => {
    await setSessionCookie(testSession);
    selectResults.push([]); // completion query empty
    const req = createRequest("POST", "/api/completions/approve", { completion_id: UUID.completion1 });
    const { status } = await parseResponse(await approve(req));
    expect(status).toBe(404);
  });

  it("approves completion and creates payment when sat_reward > 0", async () => {
    await setSessionCookie(testSession);
    selectResults.push([{
      id: UUID.completion1, habit_id: UUID.habit1, user_id: UUID.user2,
      date: "2026-03-11", status: "pending", sat_reward: 100,
      family_id: UUID.family1, assigned_to: UUID.user2, habit_name: "Read",
    }]);
    mockUpdateReturning.mockResolvedValue([{ id: UUID.completion1, status: "approved" }]);
    mockInsertValues.mockResolvedValue(undefined);

    const req = createRequest("POST", "/api/completions/approve", { completion_id: UUID.completion1 });
    const { status, body } = await parseResponse(await approve(req));
    expect(status).toBe(200);
    expect(body.data.status).toBe("approved");
    expect(mockInsertValues).toHaveBeenCalled(); // payment created
  });
});

describe("/api/completions/reject", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    selectCallCount = 0;
    selectResults.length = 0;
    await clearSessionCookie();
  });

  it("returns 404 when completion not found", async () => {
    await setSessionCookie(testSession);
    selectResults.push([]);
    const req = createRequest("POST", "/api/completions/reject", { completion_id: UUID.completion1 });
    const { status } = await parseResponse(await reject(req));
    expect(status).toBe(404);
  });

  it("rejects completion", async () => {
    await setSessionCookie(testSession);
    selectResults.push([{
      id: UUID.completion1, user_id: UUID.user2, habit_name: "Read",
    }]);
    mockUpdateReturning.mockResolvedValue([{ id: UUID.completion1, status: "rejected" }]);

    const req = createRequest("POST", "/api/completions/reject", { completion_id: UUID.completion1, reason: "Not enough evidence" });
    const { status, body } = await parseResponse(await reject(req));
    expect(status).toBe(200);
    expect(body.data.status).toBe("rejected");
  });
});
