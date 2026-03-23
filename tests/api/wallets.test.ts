// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession, UUID } from "../helpers";

const mockSelectResult = vi.fn();
const mockInsertReturning = vi.fn();
const mockUpdateReturning = vi.fn();

const chainable = () => {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.from = self; chain.where = self; chain.limit = self;
  chain.then = (r: (v: unknown) => void) => r(mockSelectResult());
  return chain;
};

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: () => chainable(),
    insert: () => ({ values: () => ({ returning: mockInsertReturning }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: mockUpdateReturning }) }) }),
  }),
  wallets: { user_id: "u", active: "a", id: "id" },
  type: undefined,
}));

vi.mock("@/lib/crypto", () => ({
  encrypt: vi.fn((s: string) => `enc_${s}`),
  decrypt: vi.fn((s: string) => s.replace("enc_", "")),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(),
}));

import { GET, POST, DELETE } from "@/app/api/wallets/route";

describe("/api/wallets", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
  });

  describe("GET", () => {
    it("returns null when no wallet", async () => {
      await setSessionCookie(testSession);
      mockSelectResult.mockReturnValue([]);
      const req = createRequest("GET", "/api/wallets");
      const { status, body } = await parseResponse(await GET(req));
      expect(status).toBe(200);
      // apiHandler returns { success: true } when result is null
      expect(body.success).toBe(true);
    });

    it("returns wallet without encrypted URL", async () => {
      await setSessionCookie(testSession);
      mockSelectResult.mockReturnValue([{
        id: UUID.wallet1, user_id: testSession.user_id, label: "My Wallet",
        active: true, nwc_url_encrypted: "enc_secret", created_at: new Date(),
      }]);
      const req = createRequest("GET", "/api/wallets");
      const { status, body } = await parseResponse(await GET(req));
      expect(status).toBe(200);
      expect(body.data.connected).toBe(true);
      expect(body.data.nwc_url_encrypted).toBeUndefined();
    });
  });

  describe("POST", () => {
    it("returns 400 for invalid NWC URL", async () => {
      await setSessionCookie(testSession);
      const req = createRequest("POST", "/api/wallets", { nwc_url: "https://bad-url" });
      const { status } = await parseResponse(await POST(req));
      expect(status).toBe(400);
    });

    it("creates wallet with valid NWC URL", async () => {
      await setSessionCookie(testSession);
      mockSelectResult.mockReturnValue([]); // no existing
      mockInsertReturning.mockResolvedValue([{
        id: UUID.wallet1, user_id: testSession.user_id, label: null,
        active: true, nwc_url_encrypted: "enc_nostr+walletconnect://test", created_at: new Date(),
      }]);

      const req = createRequest("POST", "/api/wallets", { nwc_url: "nostr+walletconnect://test" });
      const { status, body } = await parseResponse(await POST(req));
      expect(status).toBe(201);
      expect(body.data.connected).toBe(true);
    });
  });

  describe("DELETE", () => {
    it("deactivates wallet", async () => {
      await setSessionCookie(testSession);
      const req = createRequest("DELETE", "/api/wallets");
      const { status, body } = await parseResponse(await DELETE(req));
      expect(status).toBe(200);
      expect(body.success).toBe(true);
    });
  });
});
