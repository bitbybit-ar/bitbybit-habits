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

// Mock qrcode
vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn(async () => "data:image/png;base64,mockqr") },
  toDataURL: vi.fn(async () => "data:image/png;base64,mockqr"),
}));

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  hash: vi.fn(async (pw: string) => `hashed_${pw}`),
  compare: vi.fn(async (pw: string, hash: string) => hash === `hashed_${pw}`),
}));

// Mock jose
vi.mock("jose", () => ({
  jwtVerify: vi.fn(async () => ({
    payload: { user_id: "00000000-0000-0000-0000-000000000001", purpose: "2fa" },
  })),
}));

const mockSelectResult = vi.fn();
const mockUpdateResult = vi.fn();
const mockInsertResult = vi.fn();

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
          returning: mockUpdateResult,
          then: (r: (v: unknown) => void) => r(mockUpdateResult()),
        }),
        then: (r: (v: unknown) => void) => r(mockUpdateResult()),
      }),
    }),
    insert: () => ({ values: () => ({ returning: mockInsertResult }) }),
  }),
  users: { id: "id", totp_secret: "ts", totp_enabled: "te", recovery_codes: "rc", email: "e" },
  familyMembers: { user_id: "u", role: "r", joined_at: "ja" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), and: vi.fn(), or: vi.fn(),
}));

import { POST as setup } from "@/app/api/auth/2fa/setup/route";
import { POST as confirm } from "@/app/api/auth/2fa/confirm/route";
import { POST as validate } from "@/app/api/auth/2fa/validate/route";
import { POST as disable } from "@/app/api/auth/2fa/disable/route";

describe("2FA API", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
  });

  describe("POST /api/auth/2fa/setup", () => {
    it("returns 401 without session", async () => {
      const req = createRequest("POST", "/api/auth/2fa/setup");
      const { status } = await parseResponse(await setup(req));
      expect(status).toBe(401);
    });

    it("returns TOTP secret and QR code", async () => {
      await setSessionCookie(testSession);
      mockUpdateResult.mockResolvedValue([]);
      const req = createRequest("POST", "/api/auth/2fa/setup");
      const { status, body } = await parseResponse(await setup(req));
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.otpauthUri).toContain("otpauth://totp/");
      expect(body.data.qrCode).toContain("data:image/png");
    });
  });

  describe("POST /api/auth/2fa/confirm", () => {
    it("returns 400 without code", async () => {
      await setSessionCookie(testSession);
      const req = createRequest("POST", "/api/auth/2fa/confirm", {});
      const { status } = await parseResponse(await confirm(req));
      expect(status).toBe(400);
    });

    it("returns 400 when 2FA not set up", async () => {
      await setSessionCookie(testSession);
      mockSelectResult.mockReturnValue([]);
      const req = createRequest("POST", "/api/auth/2fa/confirm", { code: "123456" });
      const { status } = await parseResponse(await confirm(req));
      expect(status).toBe(400);
    });

    it("returns 400 for invalid code", async () => {
      await setSessionCookie(testSession);
      mockSelectResult.mockReturnValue([{ totp_secret: "MOCKSECRET" }]);
      mockValidate.mockReturnValue(null);
      const req = createRequest("POST", "/api/auth/2fa/confirm", { code: "000000" });
      const { status, body } = await parseResponse(await confirm(req));
      expect(status).toBe(400);
      expect(body.error).toContain("invalid_code");
    });

    it("enables 2FA and returns recovery codes", async () => {
      await setSessionCookie(testSession);
      mockSelectResult.mockReturnValue([{ totp_secret: "MOCKSECRET" }]);
      mockValidate.mockReturnValue(0);
      mockUpdateResult.mockResolvedValue([]);
      const req = createRequest("POST", "/api/auth/2fa/confirm", { code: "123456" });
      const { status, body } = await parseResponse(await confirm(req));
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.recoveryCodes).toHaveLength(8);
    });
  });

  describe("POST /api/auth/2fa/validate", () => {
    it("returns 400 without tempToken or code", async () => {
      const req = createRequest("POST", "/api/auth/2fa/validate", {});
      const { status } = await parseResponse(await validate(req));
      expect(status).toBe(400);
    });

    it("returns 400 when 2FA not enabled", async () => {
      mockSelectResult.mockReturnValue([{ id: testSession.user_id, totp_enabled: false, totp_secret: null }]);
      const req = createRequest("POST", "/api/auth/2fa/validate", { tempToken: "mock-token", code: "123456" });
      const { status } = await parseResponse(await validate(req));
      expect(status).toBe(400);
    });

    it("validates with correct TOTP code", async () => {
      mockSelectResult
        .mockReturnValueOnce([{
          id: testSession.user_id, email: "test@example.com", username: "testuser",
          display_name: "Test User", locale: "en", totp_enabled: true,
          totp_secret: "MOCKSECRET", recovery_codes: null,
        }])
        .mockReturnValueOnce([]); // familyMembers query
      mockValidate.mockReturnValue(0);
      const req = createRequest("POST", "/api/auth/2fa/validate", { tempToken: "mock-token", code: "123456" });
      const { status, body } = await parseResponse(await validate(req));
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.user_id).toBe(testSession.user_id);
    });

    it("returns 400 for wrong code", async () => {
      mockSelectResult.mockReturnValue([{
        id: testSession.user_id, email: "test@example.com", username: "testuser",
        display_name: "Test User", locale: "en", totp_enabled: true,
        totp_secret: "MOCKSECRET", recovery_codes: null,
      }]);
      mockValidate.mockReturnValue(null);
      const req = createRequest("POST", "/api/auth/2fa/validate", { tempToken: "mock-token", code: "000000" });
      const { status, body } = await parseResponse(await validate(req));
      expect(status).toBe(400);
      expect(body.error).toContain("invalid_code");
    });
  });

  describe("POST /api/auth/2fa/disable", () => {
    it("returns 401 without session", async () => {
      const req = createRequest("POST", "/api/auth/2fa/disable", { code: "123456" });
      const { status } = await parseResponse(await disable(req));
      expect(status).toBe(401);
    });

    it("returns 400 when 2FA not enabled", async () => {
      await setSessionCookie(testSession);
      mockSelectResult.mockReturnValue([{ totp_secret: null, totp_enabled: false }]);
      const req = createRequest("POST", "/api/auth/2fa/disable", { code: "123456" });
      const { status } = await parseResponse(await disable(req));
      expect(status).toBe(400);
    });

    it("disables 2FA with valid code", async () => {
      await setSessionCookie(testSession);
      mockSelectResult.mockReturnValue([{ totp_secret: "MOCKSECRET", totp_enabled: true }]);
      mockValidate.mockReturnValue(0);
      mockUpdateResult.mockResolvedValue([]);
      const req = createRequest("POST", "/api/auth/2fa/disable", { code: "123456" });
      const { status, body } = await parseResponse(await disable(req));
      expect(status).toBe(200);
      expect(body.success).toBe(true);
    });
  });
});
