// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession } from "../../helpers";

// Mock NWC client
const mockGetBalance = vi.fn();
const mockClose = vi.fn();

vi.mock("@getalby/sdk", () => ({
  NWCClient: class {
    getBalance = mockGetBalance;
    close = mockClose;
  },
}));

// Mock getDecryptedNwcUrl from the wallets route
const mockGetDecryptedNwcUrl = vi.fn();
vi.mock("@/app/api/wallets/route", () => ({
  getDecryptedNwcUrl: (...args: unknown[]) => mockGetDecryptedNwcUrl(...args),
}));

// Mock DB (needed by apiHandler)
vi.mock("@/lib/db", () => ({
  getDb: () => ({}),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(),
}));

import { GET } from "@/app/api/wallets/balance/route";

describe("GET /api/wallets/balance", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
  });

  it("returns 401 when not authenticated", async () => {
    const req = createRequest("GET", "/api/wallets/balance");
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(401);
  });

  it("returns null balance when no wallet connected", async () => {
    await setSessionCookie(testSession);
    mockGetDecryptedNwcUrl.mockResolvedValue(null);
    const req = createRequest("GET", "/api/wallets/balance");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(body.data.balance_sats).toBeNull();
  });

  it("returns balance when wallet is connected", async () => {
    await setSessionCookie(testSession);
    mockGetDecryptedNwcUrl.mockResolvedValue("nostr+walletconnect://test");
    // NWC returns balance in millisats (50000 msats = 50 sats)
    mockGetBalance.mockResolvedValue({ balance: 50000 });
    const req = createRequest("GET", "/api/wallets/balance");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(body.data.balance_sats).toBe(50);
    expect(mockClose).toHaveBeenCalled();
  });

  it("returns null balance when NWC call fails", async () => {
    await setSessionCookie(testSession);
    mockGetDecryptedNwcUrl.mockResolvedValue("nostr+walletconnect://test");
    mockGetBalance.mockRejectedValue(new Error("Connection refused"));
    const req = createRequest("GET", "/api/wallets/balance");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(body.data.balance_sats).toBeNull();
    expect(mockClose).toHaveBeenCalled();
  });
});
