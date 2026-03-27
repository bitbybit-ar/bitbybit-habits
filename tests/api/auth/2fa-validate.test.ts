// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, testSession } from "../../helpers";

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

// Mock jose
vi.mock("jose", () => ({
  jwtVerify: vi.fn(async () => ({
    payload: { user_id: "00000000-0000-0000-0000-000000000001", purpose: "2fa" },
  })),
}));

// Mock bcryptjs (for recovery code verification)
vi.mock("bcryptjs", () => ({
  hash: vi.fn(async (pw: string) => `hashed_${pw}`),
  compare: vi.fn(async (pw: string, hash: string) => hash === `hashed_${pw}`),
}));

const mockSelectResult = vi.fn();

const chainable = () => {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.from = self; chain.where = self; chain.limit = self; chain.orderBy = self;
  chain.then = (r: (v: unknown) => void) => r(mockSelectResult());
  return chain;
};

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: () => chainable(),
    update: () => ({
      set: () => ({
        where: () => ({
          then: (r: (v: unknown) => void) => r(undefined),
        }),
      }),
    }),
  }),
  users: { id: "id", email: "e", username: "u", display_name: "dn", locale: "l", totp_secret: "ts", totp_enabled: "te", recovery_codes: "rc" },
  familyMembers: { user_id: "u", role: "r", joined_at: "ja" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(),
}));

import { POST } from "@/app/api/auth/2fa/validate/route";

describe("POST /api/auth/2fa/validate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when missing fields", async () => {
    const req = createRequest("POST", "/api/auth/2fa/validate", {});
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 400 when token invalid (2FA not enabled)", async () => {
    mockSelectResult.mockReturnValue([{
      id: testSession.user_id, totp_enabled: false, totp_secret: null,
    }]);
    const req = createRequest("POST", "/api/auth/2fa/validate", { tempToken: "mock-token", code: "123456" });
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(400);
  });

  it("returns 400 when invalid code", async () => {
    mockSelectResult.mockReturnValue([{
      id: testSession.user_id, email: "test@example.com", username: "testuser",
      display_name: "Test User", locale: "en", totp_enabled: true,
      totp_secret: "MOCKSECRET", recovery_codes: null,
    }]);
    mockValidate.mockReturnValue(null);
    const req = createRequest("POST", "/api/auth/2fa/validate", { tempToken: "mock-token", code: "000000" });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(body.error).toContain("invalid_code");
  });

  it("validates successfully with correct TOTP code", async () => {
    mockSelectResult
      .mockReturnValueOnce([{
        id: testSession.user_id, email: "test@example.com", username: "testuser",
        display_name: "Test User", locale: "en", totp_enabled: true,
        totp_secret: "MOCKSECRET", recovery_codes: null,
      }])
      .mockReturnValueOnce([{ role: "sponsor" }]); // familyMembers query
    mockValidate.mockReturnValue(0);

    const req = createRequest("POST", "/api/auth/2fa/validate", { tempToken: "mock-token", code: "123456" });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.user_id).toBe(testSession.user_id);
    expect(body.data.email).toBe("test@example.com");
  });
});
