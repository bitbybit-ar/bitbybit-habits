// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession } from "../../helpers";

// Mock NWC client and error classes
const mockPayInvoice = vi.fn();
const mockClose = vi.fn();

vi.mock("@getalby/sdk", () => {
  class Nip47Error extends Error {
    code: string;
    constructor(code: string) { super(code); this.code = code; }
  }
  return {
    NWCClient: class {
      payInvoice = mockPayInvoice;
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

import { POST } from "@/app/api/wallets/send/route";

// Valid bech32 BOLT11 invoice for testing
const VALID_BOLT11 = "lnbc1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq8rkx3yf5tcsyz3d73gafnh3cax9rn449d9p5uxz9ezhhypd0elx87sjle52x86fux2ypatgddc6k63n7erqz25le42c4u4ecky03ylcqca784w";

describe("POST /api/wallets/send", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
  });

  it("returns 401 when not authenticated", async () => {
    const req = createRequest("POST", "/api/wallets/send", { invoice: VALID_BOLT11 });
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(401);
  });

  it("returns 400 when invoice is missing", async () => {
    await setSessionCookie(testSession);
    const req = createRequest("POST", "/api/wallets/send", {});
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(body.error).toBe("missing_invoice");
  });

  it("returns 400 for invalid BOLT11 format", async () => {
    await setSessionCookie(testSession);
    const req = createRequest("POST", "/api/wallets/send", { invoice: "not-a-bolt11" });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(body.error).toBe("invalid_invoice");
  });

  it("strips lightning: prefix before validation", async () => {
    await setSessionCookie(testSession);
    mockGetDecryptedNwcUrl.mockResolvedValue("nostr+walletconnect://test");
    mockPayInvoice.mockResolvedValue({ preimage: "abc123" });

    const req = createRequest("POST", "/api/wallets/send", { invoice: `lightning:${VALID_BOLT11}` });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(body.data.preimage).toBe("abc123");
  });

  it("returns 400 when no wallet connected", async () => {
    await setSessionCookie(testSession);
    mockGetDecryptedNwcUrl.mockResolvedValue(null);
    const req = createRequest("POST", "/api/wallets/send", { invoice: VALID_BOLT11 });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(body.error).toBe("no_wallet");
  });

  it("pays invoice successfully", async () => {
    await setSessionCookie(testSession);
    mockGetDecryptedNwcUrl.mockResolvedValue("nostr+walletconnect://test");
    mockPayInvoice.mockResolvedValue({ preimage: "preimage123" });

    const req = createRequest("POST", "/api/wallets/send", { invoice: VALID_BOLT11 });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(body.data.preimage).toBe("preimage123");
    expect(mockClose).toHaveBeenCalled();
  });

  it("returns insufficient_funds on wallet error", async () => {
    await setSessionCookie(testSession);
    mockGetDecryptedNwcUrl.mockResolvedValue("nostr+walletconnect://test");
    // The route catches generic errors with "insufficient" in the message
    mockPayInvoice.mockRejectedValue(new Error("Insufficient balance"));

    const req = createRequest("POST", "/api/wallets/send", { invoice: VALID_BOLT11 });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(body.error).toBe("insufficient_funds");
    expect(mockClose).toHaveBeenCalled();
  });

  it("returns nwc_timeout on timeout error", async () => {
    await setSessionCookie(testSession);
    mockGetDecryptedNwcUrl.mockResolvedValue("nostr+walletconnect://test");
    mockPayInvoice.mockRejectedValue(new Error("timeout"));

    const req = createRequest("POST", "/api/wallets/send", { invoice: VALID_BOLT11 });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(body.error).toBe("nwc_timeout");
  });
});
