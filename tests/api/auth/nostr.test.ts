// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, clearSessionCookie, UUID } from "../../helpers";

const mockSelectResult = vi.fn();
const mockInsertReturning = vi.fn();

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
    insert: () => ({ values: () => ({ returning: mockInsertReturning }) }),
  }),
  users: { id: "id", email: "e", username: "u", display_name: "dn", avatar_url: "av", locale: "l", nostr_pubkey: "np", auth_provider: "ap" },
  familyMembers: { user_id: "uid", role: "r", joined_at: "ja", family_id: "fid" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), or: vi.fn(),
}));

vi.mock("@/lib/nostr", () => ({
  validateAuthEvent: vi.fn(),
}));

import { GET, POST } from "@/app/api/auth/nostr/route";
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

async function clearChallengeCookie() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  (cookieStore as unknown as { delete: (n: string) => void }).delete("nostr_challenge");
}

describe("/api/auth/nostr", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
    await clearChallengeCookie();
  });

  it("GET returns a 64-char hex challenge", async () => {
    const req = createRequest("GET", "/api/auth/nostr");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(body.data.challenge).toMatch(/^[a-f0-9]{64}$/);
  });

  it("POST returns 400 when no challenge cookie exists", async () => {
    const req = createRequest("POST", "/api/auth/nostr", { signedEvent: mockSignedEvent });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(body.error).toBe("no_challenge");
  });

});
