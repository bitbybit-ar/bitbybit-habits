// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, UUID } from "../../helpers";

let selectCallCount = 0;
const selectResults: unknown[][] = [];
const mockInsertReturning = vi.fn();

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
    insert: () => ({ values: () => ({ returning: mockInsertReturning }) }),
    update: () => ({ set: () => ({ where: vi.fn(async () => {}) }) }),
    delete: () => ({ where: vi.fn(async () => {}) }),
  }),
  families: { id: "id", invite_code: "ic", created_by: "cb" },
  familyMembers: { family_id: "f", user_id: "u", role: "r", id: "id" },
  habits: { family_id: "f" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), ne: vi.fn(),
}));

import { POST as join } from "@/app/api/families/join/route";
import { POST as leave } from "@/app/api/families/leave/route";

describe("POST /api/families/join", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    selectCallCount = 0;
    selectResults.length = 0;
    await clearSessionCookie();
  });

  it("returns 400 without invite_code", async () => {
    await setSessionCookie(testSession);
    const req = createRequest("POST", "/api/families/join", { invite_code: "" });
    const { status } = await parseResponse(await join(req));
    expect(status).toBe(400);
  });

  it("returns 404 for invalid invite code", async () => {
    await setSessionCookie(testSession);
    selectResults.push([]); // family not found
    const req = createRequest("POST", "/api/families/join", { invite_code: "BADCODE" });
    const { status } = await parseResponse(await join(req));
    expect(status).toBe(404);
  });

  it("returns 409 when already a member", async () => {
    await setSessionCookie(testSession);
    selectResults.push([{ id: UUID.family1 }]); // family found
    selectResults.push([{ id: "existing" }]); // already member
    const req = createRequest("POST", "/api/families/join", { invite_code: "ABC123" });
    const { status } = await parseResponse(await join(req));
    expect(status).toBe(409);
  });

  it("joins family as kid by default", async () => {
    await setSessionCookie(testSession);
    selectResults.push([{ id: UUID.family1, name: "Fam" }]); // family
    selectResults.push([]); // not a member yet
    mockInsertReturning.mockResolvedValue([{ family_id: UUID.family1, role: "kid" }]);

    const req = createRequest("POST", "/api/families/join", { invite_code: "ABC123" });
    const { status, body } = await parseResponse(await join(req));
    expect(status).toBe(201);
    expect(body.data.member.role).toBe("kid");
  });
});

describe("POST /api/families/leave", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    selectCallCount = 0;
    selectResults.length = 0;
    await clearSessionCookie();
  });

  it("returns 400 without family_id", async () => {
    await setSessionCookie(testSession);
    const req = createRequest("POST", "/api/families/leave", {});
    const { status } = await parseResponse(await leave(req));
    expect(status).toBe(400);
  });

  it("returns 404 when not a member", async () => {
    await setSessionCookie(testSession);
    selectResults.push([]); // not a member
    const req = createRequest("POST", "/api/families/leave", { family_id: UUID.family1 });
    const { status } = await parseResponse(await leave(req));
    expect(status).toBe(404);
  });

  it("prevents last sponsor from leaving when others exist", async () => {
    await setSessionCookie(testSession);
    selectResults.push([{ id: "m1", role: "sponsor" }]); // user is sponsor
    selectResults.push([]); // no other sponsors
    selectResults.push([{ id: "m2" }]); // other members exist
    const req = createRequest("POST", "/api/families/leave", { family_id: UUID.family1 });
    const { status } = await parseResponse(await leave(req));
    expect(status).toBe(400);
  });

  it("allows kid to leave", async () => {
    await setSessionCookie(testSession);
    selectResults.push([{ id: "m1", role: "kid" }]); // user is kid
    selectResults.push([]); // remaining members (for cleanup check)
    const req = createRequest("POST", "/api/families/leave", { family_id: UUID.family1 });
    const { status, body } = await parseResponse(await leave(req));
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});
