// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, UUID } from "../../helpers";
import type { AuthSession } from "@/lib/types";

let selectCallCount = 0;
const selectResults: unknown[][] = [];

const chainable = () => {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.from = self; chain.where = self; chain.innerJoin = self; chain.leftJoin = self;
  chain.orderBy = self; chain.limit = self; chain.offset = self;
  chain.then = (r: (v: unknown) => void) => r(selectResults[selectCallCount++] ?? []);
  return chain;
};

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: () => chainable(),
  }),
  users: { id: "id", email: "e", username: "u", display_name: "dn", avatar_url: "av", nostr_pubkey: "np", locale: "l", totp_enabled: "te", failed_login_attempts: "fla", locked_until: "lu", created_at: "ca", updated_at: "ua" },
  familyMembers: { user_id: "uid", family_id: "fid", role: "r" },
  families: { id: "id", name: "n" },
  wallets: { user_id: "uid", active: "a" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), or: vi.fn(), desc: vi.fn(), ilike: vi.fn(), count: vi.fn(), inArray: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  isAdmin: vi.fn(),
}));

import { GET } from "@/app/api/admin/users/route";
import { isAdmin } from "@/lib/admin";

const adminSession: AuthSession = {
  ...testSession,
  nostr_pubkey: "admin-pubkey",
};

describe("GET /api/admin/users", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    selectCallCount = 0;
    selectResults.length = 0;
    await clearSessionCookie();
  });

  it("returns 401 without session", async () => {
    const req = createRequest("GET", "/api/admin/users");
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(401);
  });

  it("returns 403 when user is not admin", async () => {
    await setSessionCookie(testSession);
    vi.mocked(isAdmin).mockReturnValue(false);

    const req = createRequest("GET", "/api/admin/users");
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(403);
  });

  it("returns paginated user list", async () => {
    await setSessionCookie(adminSession);
    vi.mocked(isAdmin).mockReturnValue(true);

    // Total count
    selectResults.push([{ total: 2 }]);
    // User rows
    selectResults.push([
      { id: UUID.user1, email: "a@test.com", username: "user1", display_name: "User 1", created_at: "2026-01-01" },
      { id: UUID.user2, email: "b@test.com", username: "user2", display_name: "User 2", created_at: "2026-01-02" },
    ]);
    // Memberships
    selectResults.push([{ user_id: UUID.user1, family_id: UUID.family1, role: "sponsor", family_name: "Family 1" }]);
    // Wallets
    selectResults.push([{ user_id: UUID.user1, active: true }]);

    const req = createRequest("GET", "/api/admin/users");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(body.data.users).toHaveLength(2);
    expect(body.data.total).toBe(2);
    expect(body.data.page).toBe(1);
  });

  it("filters by family when family param is provided", async () => {
    await setSessionCookie(adminSession);
    vi.mocked(isAdmin).mockReturnValue(true);

    // Family member user IDs
    selectResults.push([{ user_id: UUID.user1 }]);
    // Total count
    selectResults.push([{ total: 1 }]);
    // User rows
    selectResults.push([{ id: UUID.user1, email: "a@test.com", username: "user1", display_name: "User 1", created_at: "2026-01-01" }]);
    // Memberships
    selectResults.push([{ user_id: UUID.user1, family_id: UUID.family1, role: "sponsor", family_name: "Family 1" }]);
    // Wallets
    selectResults.push([]);

    const req = createRequest("GET", "/api/admin/users", undefined, { family: UUID.family1 });
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(body.data.users).toHaveLength(1);
  });

  it("returns empty when family has no members", async () => {
    await setSessionCookie(adminSession);
    vi.mocked(isAdmin).mockReturnValue(true);

    // Family member user IDs: none
    selectResults.push([]);

    const req = createRequest("GET", "/api/admin/users", undefined, { family: UUID.family1 });
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(body.data.users).toHaveLength(0);
    expect(body.data.total).toBe(0);
  });
});
