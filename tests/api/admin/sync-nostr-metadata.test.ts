// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, UUID } from "../../helpers";
import type { AuthSession } from "@/lib/types";

const mockSelectResult = vi.fn();
const mockUpdateSet = vi.fn(() => ({ where: vi.fn(async () => {}) }));

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
    update: () => ({ set: mockUpdateSet }),
  }),
  users: { id: "id", nostr_pubkey: "np", display_name: "dn", avatar_url: "av", auth_provider: "ap", nostr_metadata: "nm", nostr_metadata_updated_at: "nmua" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), isNotNull: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  isAdmin: vi.fn(),
}));

vi.mock("@/lib/nostr/server-metadata", () => ({
  fetchNostrMetadataServer: vi.fn(),
}));

import { POST } from "@/app/api/admin/sync-nostr-metadata/route";
import { isAdmin } from "@/lib/admin";
import { fetchNostrMetadataServer } from "@/lib/nostr/server-metadata";

const adminSession: AuthSession = {
  ...testSession,
  nostr_pubkey: "admin-pubkey",
};

describe("POST /api/admin/sync-nostr-metadata", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
  });

  it("returns 401 without session", async () => {
    const req = createRequest("POST", "/api/admin/sync-nostr-metadata");
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(401);
  });

  it("returns 401 when not admin", async () => {
    await setSessionCookie(testSession);
    vi.mocked(isAdmin).mockReturnValue(false);

    const req = createRequest("POST", "/api/admin/sync-nostr-metadata");
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(401);
  });

  it("syncs metadata for nostr users", async () => {
    await setSessionCookie(adminSession);
    vi.mocked(isAdmin).mockReturnValue(true);

    // Nostr users list
    mockSelectResult.mockReturnValue([
      { id: UUID.user1, nostr_pubkey: "pubkey1", display_name: "Old Name", avatar_url: null },
      { id: UUID.user2, nostr_pubkey: "pubkey2", display_name: "User 2", avatar_url: null },
    ]);

    vi.mocked(fetchNostrMetadataServer)
      .mockResolvedValueOnce({ display_name: "New Name", picture: "https://pic.com/1.jpg" })
      .mockResolvedValueOnce(null); // no metadata for second user

    const req = createRequest("POST", "/api/admin/sync-nostr-metadata");
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(body.data.total).toBe(2);
    expect(body.data.synced).toBe(1);
    expect(body.data.no_metadata).toBe(1);
    expect(mockUpdateSet).toHaveBeenCalledTimes(1);
  });

  it("handles fetch errors gracefully", async () => {
    await setSessionCookie(adminSession);
    vi.mocked(isAdmin).mockReturnValue(true);

    mockSelectResult.mockReturnValue([
      { id: UUID.user1, nostr_pubkey: "pubkey1", display_name: "User", avatar_url: null },
    ]);

    vi.mocked(fetchNostrMetadataServer).mockRejectedValue(new Error("relay timeout"));

    const req = createRequest("POST", "/api/admin/sync-nostr-metadata");
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(body.data.failed).toBe(1);
    expect(body.data.synced).toBe(0);
  });
});
