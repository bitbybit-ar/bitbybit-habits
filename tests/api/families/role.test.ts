// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, UUID } from "../../helpers";

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
  getDb: () => ({
    select: () => chainable(),
    update: () => ({ set: () => ({ where: vi.fn(async () => {}) }) }),
  }),
  familyMembers: { family_id: "f", user_id: "u", role: "r", id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), ne: vi.fn(),
}));

import { PATCH } from "@/app/api/families/role/route";

describe("PATCH /api/families/role", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    selectCallCount = 0;
    selectResults.length = 0;
    await clearSessionCookie();
  });

  it("returns 400 when fields are missing", async () => {
    await setSessionCookie(testSession);
    const req = createRequest("PATCH", "/api/families/role", { family_id: UUID.family1 });
    const { status } = await parseResponse(await PATCH(req));
    expect(status).toBe(400);
  });

  it("returns 400 for invalid role", async () => {
    await setSessionCookie(testSession);
    const req = createRequest("PATCH", "/api/families/role", {
      family_id: UUID.family1, user_id: UUID.user2, new_role: "admin",
    });
    const { status } = await parseResponse(await PATCH(req));
    expect(status).toBe(400);
  });

  it("returns 403 when requester is not sponsor", async () => {
    await setSessionCookie(testSession);
    selectResults.push([{ role: "kid" }]); // requester is kid
    const req = createRequest("PATCH", "/api/families/role", {
      family_id: UUID.family1, user_id: UUID.user2, new_role: "sponsor",
    });
    const { status } = await parseResponse(await PATCH(req));
    expect(status).toBe(403);
  });

  it("prevents demoting last sponsor", async () => {
    await setSessionCookie(testSession);
    selectResults.push([{ role: "sponsor" }]); // requester is sponsor
    selectResults.push([{ role: "sponsor" }]); // target is sponsor
    selectResults.push([]); // no other sponsors
    const req = createRequest("PATCH", "/api/families/role", {
      family_id: UUID.family1, user_id: UUID.user2, new_role: "kid",
    });
    const { status } = await parseResponse(await PATCH(req));
    expect(status).toBe(400);
  });

  it("changes role successfully", async () => {
    await setSessionCookie(testSession);
    selectResults.push([{ role: "sponsor" }]); // requester
    selectResults.push([{ role: "kid" }]); // target
    const req = createRequest("PATCH", "/api/families/role", {
      family_id: UUID.family1, user_id: UUID.user2, new_role: "sponsor",
    });
    const { status, body } = await parseResponse(await PATCH(req));
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});
