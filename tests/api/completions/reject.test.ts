// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, kidSession, UUID } from "../../helpers";

let selectCallCount = 0;
const selectResults: unknown[][] = [];
const mockUpdateReturning = vi.fn();

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
    update: () => ({ set: () => ({ where: () => ({ returning: mockUpdateReturning }) }) }),
  }),
  completions: { id: "id", habit_id: "h", status: "s", user_id: "u" },
  habits: { id: "id", family_id: "f", name: "n" },
  familyMembers: { family_id: "f", user_id: "u", role: "r" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), sql: Object.assign(vi.fn(() => "NOW()"), { raw: vi.fn() }),
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(),
}));

import { POST } from "@/app/api/completions/reject/route";

describe("POST /api/completions/reject", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    selectCallCount = 0;
    selectResults.length = 0;
    await clearSessionCookie();
  });

  it("returns 401 when not authenticated", async () => {
    const req = createRequest("POST", "/api/completions/reject", { completion_id: UUID.completion1 });
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(401);
  });

  it("returns 404 when kid tries to reject (filtered by sponsor role)", async () => {
    await setSessionCookie(kidSession);
    selectResults.push([]); // query filters by role=sponsor, so kid gets empty result
    const req = createRequest("POST", "/api/completions/reject", { completion_id: UUID.completion1 });
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(404);
  });

  it("returns 400 when completion_id missing", async () => {
    await setSessionCookie(testSession);
    const req = createRequest("POST", "/api/completions/reject", {});
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 404 when completion not found or already processed", async () => {
    await setSessionCookie(testSession);
    selectResults.push([]); // no matching completion
    const req = createRequest("POST", "/api/completions/reject", { completion_id: UUID.completion1 });
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(404);
  });

  it("rejects completion successfully", async () => {
    await setSessionCookie(testSession);
    selectResults.push([{
      id: UUID.completion1, user_id: UUID.user2, habit_name: "Clean room",
    }]);
    mockUpdateReturning.mockResolvedValue([{ id: UUID.completion1, status: "rejected" }]);

    const req = createRequest("POST", "/api/completions/reject", {
      completion_id: UUID.completion1,
      reason: "Not enough evidence",
    });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(body.data.status).toBe("rejected");
  });

  it("rejects completion without reason", async () => {
    await setSessionCookie(testSession);
    selectResults.push([{
      id: UUID.completion1, user_id: UUID.user2, habit_name: "Read",
    }]);
    mockUpdateReturning.mockResolvedValue([{ id: UUID.completion1, status: "rejected" }]);

    const req = createRequest("POST", "/api/completions/reject", { completion_id: UUID.completion1 });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(body.data.status).toBe("rejected");
  });
});
