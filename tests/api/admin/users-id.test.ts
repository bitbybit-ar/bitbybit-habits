// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, UUID } from "../../helpers";
import type { AuthSession } from "@/lib/types";

const mockSelectResult = vi.fn();
const mockUpdateReturning = vi.fn();
const mockDeleteWhere = vi.fn(async () => {});

const chainable = () => {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.from = self; chain.where = self; chain.innerJoin = self; chain.leftJoin = self;
  chain.orderBy = self; chain.limit = self;
  chain.then = (r: (v: unknown) => void) => r(mockSelectResult());
  return chain;
};

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: () => chainable(),
    update: () => ({ set: () => ({ where: () => ({ returning: mockUpdateReturning }) }) }),
    delete: () => ({ where: mockDeleteWhere }),
  }),
  users: { id: "id", email: "e", username: "u", display_name: "dn", avatar_url: "av", nostr_pubkey: "np", locale: "l", totp_enabled: "te", failed_login_attempts: "fla", locked_until: "lu", created_at: "ca", updated_at: "ua", password_hash: "ph", assigned_to: "at" },
  familyMembers: { user_id: "uid" },
  completions: { user_id: "uid" },
  payments: { from_user_id: "fu", to_user_id: "tu", status: "s", amount_sats: "as" },
  habits: { assigned_to: "at" },
  wallets: { user_id: "uid", id: "id", active: "a", label: "l", created_at: "ca" },
  notifications: { user_id: "uid" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), or: vi.fn(), count: vi.fn(), sql: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  isAdmin: vi.fn(),
}));

import { GET, PATCH, DELETE } from "@/app/api/admin/users/[id]/route";
import { isAdmin } from "@/lib/admin";

const adminSession: AuthSession = {
  ...testSession,
  user_id: "00000000-0000-0000-0000-000000000099",
  nostr_pubkey: "admin-pubkey",
};

const routeCtx = { params: Promise.resolve({ id: UUID.user1 }) };
const selfCtx = { params: Promise.resolve({ id: adminSession.user_id }) };

describe("/api/admin/users/[id]", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
  });

  it("returns 403 when not admin", async () => {
    await setSessionCookie(testSession);
    vi.mocked(isAdmin).mockReturnValue(false);

    const req = createRequest("GET", `/api/admin/users/${UUID.user1}`);
    const { status } = await parseResponse(await GET(req, routeCtx));
    expect(status).toBe(403);
  });

  it("updates user fields successfully", async () => {
    await setSessionCookie(adminSession);
    vi.mocked(isAdmin).mockReturnValue(true);
    mockUpdateReturning.mockResolvedValue([{
      id: UUID.user1,
      display_name: "Updated Name",
      locale: "en",
    }]);

    const req = createRequest("PATCH", `/api/admin/users/${UUID.user1}`, { display_name: "Updated Name" });
    const { status, body } = await parseResponse(await PATCH(req, routeCtx));
    expect(status).toBe(200);
    expect(body.data.display_name).toBe("Updated Name");
  });

  it("prevents admin from deleting themselves", async () => {
    await setSessionCookie(adminSession);
    vi.mocked(isAdmin).mockReturnValue(true);

    const req = createRequest("DELETE", `/api/admin/users/${adminSession.user_id}`);
    const { status, body } = await parseResponse(await DELETE(req, selfCtx));
    expect(status).toBe(400);
    expect(body.error).toBe("cannot_delete_self");
  });

  it("deletes user with cascading cleanup", async () => {
    await setSessionCookie(adminSession);
    vi.mocked(isAdmin).mockReturnValue(true);
    mockSelectResult.mockReturnValue([{ id: UUID.user1 }]);

    const req = createRequest("DELETE", `/api/admin/users/${UUID.user1}`);
    const { status, body } = await parseResponse(await DELETE(req, routeCtx));
    expect(status).toBe(200);
    expect(body.data.deleted).toBe(true);
    expect(mockDeleteWhere).toHaveBeenCalledTimes(4); // notifications, wallets, familyMembers, user
  });
});
