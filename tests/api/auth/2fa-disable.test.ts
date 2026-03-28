// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession } from "../../helpers";

// Mock otpauth
const mockValidate = vi.fn();
vi.mock("otpauth", () => {
  class MockTOTP {
    secret = { base32: "MOCKSECRET" };
    toString() { return "otpauth://totp/BitByBit:test@example.com?secret=MOCKSECRET&issuer=BitByBit"; }
    validate(opts: { token: string; window: number }) { return mockValidate(opts); }
  }
  return { TOTP: MockTOTP };
});

const mockSelectResult = vi.fn();
const mockUpdateResult = vi.fn();

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
    update: () => ({
      set: () => ({
        where: () => ({
          then: (r: (v: unknown) => void) => r(mockUpdateResult()),
        }),
      }),
    }),
  }),
  users: { id: "id", totp_secret: "ts", totp_enabled: "te", recovery_codes: "rc" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}));

import { POST } from "@/app/api/auth/2fa/disable/route";

describe("POST /api/auth/2fa/disable", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
  });

  it("returns 401 when not authenticated", async () => {
    const req = createRequest("POST", "/api/auth/2fa/disable", { code: "123456" });
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(401);
  });

  it("returns 400 when 2FA not enabled", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValue([{ totp_secret: null, totp_enabled: false }]);
    const req = createRequest("POST", "/api/auth/2fa/disable", { code: "123456" });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(body.error).toContain("2fa_not_enabled");
  });

  it("returns 400 when code is invalid", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValue([{ totp_secret: "MOCKSECRET", totp_enabled: true }]);
    mockValidate.mockReturnValue(null);
    const req = createRequest("POST", "/api/auth/2fa/disable", { code: "000000" });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(body.error).toContain("invalid_code");
  });

  it("disables 2FA successfully with valid code", async () => {
    await setSessionCookie(testSession);
    mockSelectResult.mockReturnValue([{ totp_secret: "MOCKSECRET", totp_enabled: true }]);
    mockValidate.mockReturnValue(0);
    mockUpdateResult.mockResolvedValue([]);
    const req = createRequest("POST", "/api/auth/2fa/disable", { code: "123456" });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.message).toContain("2FA deshabilitado");
  });
});
