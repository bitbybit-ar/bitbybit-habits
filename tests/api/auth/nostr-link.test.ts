// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, UUID } from "../../helpers";

let selectCallCount = 0;
const selectResults: unknown[][] = [];
const mockUpdateReturning = vi.fn();
const mockUpdateSet = vi.fn();

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
    update: () => ({
      set: (vals: unknown) => {
        mockUpdateSet(vals);
        return {
          where: () => ({
            returning: mockUpdateReturning,
            then: (r: (v: unknown) => void) => r(undefined),
          }),
        };
      },
    }),
  }),
  users: { id: "id", email: "e", username: "u", display_name: "dn", avatar_url: "av", locale: "l", nostr_pubkey: "np", password_hash: "ph" },
  familyMembers: { user_id: "uid", role: "r", joined_at: "ja", family_id: "fid" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), or: vi.fn(),
}));

vi.mock("@/lib/nostr", () => ({
  validateAuthEvent: vi.fn(),
}));

import { POST, DELETE } from "@/app/api/auth/nostr/link/route";
import { validateAuthEvent } from "@/lib/nostr";

const MOCK_PUBKEY = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

const mockSignedEvent = {
  id: "event-id",
  pubkey: MOCK_PUBKEY,
  created_at: Math.floor(Date.now() / 1000),
  kind: 22242,
  tags: [],
  content: "test-challenge",
  sig: "mock-sig",
};

async function setChallengeCookie() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  (cookieStore as unknown as { set: (n: string, v: string) => void }).set("nostr_challenge", "test-challenge");
}

describe("POST /api/auth/nostr/link", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    selectCallCount = 0;
    selectResults.length = 0;
    await clearSessionCookie();
  });

  it("returns 409 when pubkey is already linked to another account", async () => {
    await setSessionCookie(testSession);
    await setChallengeCookie();
    vi.mocked(validateAuthEvent).mockReturnValue(true);

    selectResults.push([{ id: UUID.user3 }]); // pubkey belongs to different user

    const req = createRequest("POST", "/api/auth/nostr/link", { signedEvent: mockSignedEvent });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(409);
    expect(body.error).toBe("nostr_pubkey_already_linked");
  });

  it("returns 409 when account already has a nostr pubkey", async () => {
    await setSessionCookie(testSession);
    await setChallengeCookie();
    vi.mocked(validateAuthEvent).mockReturnValue(true);

    selectResults.push([]); // no other user has this pubkey
    selectResults.push([{ nostr_pubkey: "existing-pubkey" }]); // current user already linked

    const req = createRequest("POST", "/api/auth/nostr/link", { signedEvent: mockSignedEvent });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(409);
    expect(body.error).toBe("account_already_has_nostr");
  });

  it("links nostr pubkey successfully", async () => {
    await setSessionCookie(testSession);
    await setChallengeCookie();
    vi.mocked(validateAuthEvent).mockReturnValue(true);

    selectResults.push([]); // no other user has this pubkey
    selectResults.push([{ nostr_pubkey: null }]); // current user has no pubkey
    selectResults.push([{ role: "sponsor" }]); // family membership

    mockUpdateReturning.mockResolvedValue([{
      id: UUID.user1, email: testSession.email, username: testSession.username,
      display_name: testSession.display_name, avatar_url: null, locale: "en", nostr_pubkey: MOCK_PUBKEY,
    }]);

    const req = createRequest("POST", "/api/auth/nostr/link", { signedEvent: mockSignedEvent });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(body.data.nostr_pubkey).toBe(MOCK_PUBKEY);
  });
});

describe("DELETE /api/auth/nostr/link", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    selectCallCount = 0;
    selectResults.length = 0;
    await clearSessionCookie();
  });

  it("prevents unlinking when nostr is the only auth method", async () => {
    await setSessionCookie(testSession);
    selectResults.push([{ password_hash: null, nostr_pubkey: MOCK_PUBKEY }]);

    const req = createRequest("DELETE", "/api/auth/nostr/link");
    const { status, body } = await parseResponse(await DELETE(req));
    expect(status).toBe(400);
    expect(body.error).toBe("cannot_unlink_only_auth_method");
  });

  it("unlinks nostr when user has password as fallback", async () => {
    await setSessionCookie(testSession);
    selectResults.push([{ password_hash: "hashed", nostr_pubkey: MOCK_PUBKEY }]);
    selectResults.push([{ role: "sponsor" }]); // family membership

    const req = createRequest("DELETE", "/api/auth/nostr/link");
    const { status, body } = await parseResponse(await DELETE(req));
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});
