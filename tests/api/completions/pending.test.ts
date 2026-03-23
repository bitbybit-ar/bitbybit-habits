// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, UUID } from "../../helpers";

const mockSelectResult = vi.fn();

const chainable = () => {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.from = self; chain.where = self; chain.innerJoin = self;
  chain.orderBy = self; chain.limit = self;
  chain.then = (r: (v: unknown) => void) => r(mockSelectResult());
  return chain;
};

vi.mock("@/lib/db", () => ({
  getDb: () => ({ select: () => chainable() }),
  completions: { status: "s", completed_at: "ca" },
  habits: { id: "id", name: "n", color: "c", sat_reward: "sr" },
  users: { id: "id", display_name: "dn" },
  familyMembers: { family_id: "f", user_id: "u", role: "r" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), desc: vi.fn(),
}));

import { GET } from "@/app/api/completions/pending/route";

describe("GET /api/completions/pending", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
  });

  it("returns 401 without session", async () => {
    const req = createRequest("GET", "/api/completions/pending");
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(401);
  });

  it("returns pending completions for sponsor", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValue([
      { id: UUID.completion1, habit_name: "Read", kid_name: "Kiddo", sat_reward: 50, date: "2026-03-11" },
    ]);

    const req = createRequest("GET", "/api/completions/pending");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].kid_name).toBe("Kiddo");
  });
});
