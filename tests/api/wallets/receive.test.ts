// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession } from "../../helpers";

// Mock NWC client and error classes
const mockMakeInvoice = vi.fn();
const mockClose = vi.fn();

vi.mock("@getalby/sdk", () => {
  class Nip47Error extends Error {
    code: string;
    constructor(code: string) { super(code); this.code = code; }
  }
  return {
    NWCClient: class {
      makeInvoice = mockMakeInvoice;
      close = mockClose;
    },
    Nip47WalletError: class extends Nip47Error {},
    Nip47TimeoutError: class extends Nip47Error {},
    Nip47NetworkError: class extends Nip47Error {},
  };
});

const mockGetDecryptedNwcUrl = vi.fn();
vi.mock("@/app/api/wallets/route", () => ({
  getDecryptedNwcUrl: (...args: unknown[]) => mockGetDecryptedNwcUrl(...args),
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({}),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(),
}));

vi.mock("@/lib/lightning", () => ({
  extractPaymentHash: vi.fn(() => "fallback_hash_from_bolt11"),
}));

import { POST } from "@/app/api/wallets/receive/route";

describe("POST /api/wallets/receive", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
  });

  it("returns 401 when not authenticated", async () => {
    const req = createRequest("POST", "/api/wallets/receive", { amount_sats: 100 });
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(401);
  });

  it("returns 400 for invalid amount", async () => {
    await setSessionCookie(testSession);
    const req = createRequest("POST", "/api/wallets/receive", { amount_sats: -10 });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(body.error).toBe("invalid_amount");
  });

  it("returns 400 when amount exceeds limit", async () => {
    await setSessionCookie(testSession);
    const req = createRequest("POST", "/api/wallets/receive", { amount_sats: 2_000_000 });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(body.error).toBe("amount_exceeds_limit");
  });

  it("returns 400 when description is too long", async () => {
    await setSessionCookie(testSession);
    const req = createRequest("POST", "/api/wallets/receive", {
      amount_sats: 100,
      description: "x".repeat(501),
    });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(body.error).toBe("description_too_long");
  });

  it("returns 400 when no wallet connected", async () => {
    await setSessionCookie(testSession);
    mockGetDecryptedNwcUrl.mockResolvedValue(null);
    const req = createRequest("POST", "/api/wallets/receive", { amount_sats: 100 });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(body.error).toBe("no_wallet");
  });

  it("creates invoice successfully", async () => {
    await setSessionCookie(testSession);
    mockGetDecryptedNwcUrl.mockResolvedValue("nostr+walletconnect://test");
    mockMakeInvoice.mockResolvedValue({
      invoice: "lnbc100n1...",
      payment_hash: "hash123",
    });

    const req = createRequest("POST", "/api/wallets/receive", {
      amount_sats: 100,
      description: "Test invoice",
    });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(body.data.payment_request).toBe("lnbc100n1...");
    expect(body.data.payment_hash).toBe("hash123");
    expect(mockClose).toHaveBeenCalled();
  });

  it("falls back to extractPaymentHash when wallet returns empty hash", async () => {
    await setSessionCookie(testSession);
    mockGetDecryptedNwcUrl.mockResolvedValue("nostr+walletconnect://test");
    mockMakeInvoice.mockResolvedValue({
      invoice: "lnbc100n1...",
      payment_hash: "",
    });

    const req = createRequest("POST", "/api/wallets/receive", { amount_sats: 100 });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(body.data.payment_hash).toBe("fallback_hash_from_bolt11");
  });

  it("returns nwc_timeout on timeout", async () => {
    await setSessionCookie(testSession);
    mockGetDecryptedNwcUrl.mockResolvedValue("nostr+walletconnect://test");
    mockMakeInvoice.mockRejectedValue(new Error("timeout"));

    const req = createRequest("POST", "/api/wallets/receive", { amount_sats: 100 });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(body.error).toBe("nwc_timeout");
    expect(mockClose).toHaveBeenCalled();
  });
});
