// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession } from "../../helpers";

// Mock otpauth
vi.mock("otpauth", () => {
  class MockTOTP {
    secret = { base32: "MOCKSECRET" };
    toString() { return "otpauth://totp/BitByBit:test@example.com?secret=MOCKSECRET&issuer=BitByBit"; }
  }
  return { TOTP: MockTOTP };
});

// Mock qrcode
vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn(async () => "data:image/png;base64,mockqr") },
  toDataURL: vi.fn(async () => "data:image/png;base64,mockqr"),
}));

const mockUpdateResult = vi.fn();

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    update: () => ({
      set: () => ({
        where: () => ({
          then: (r: (v: unknown) => void) => r(mockUpdateResult()),
        }),
      }),
    }),
  }),
  users: { id: "id", totp_secret: "ts", totp_enabled: "te" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}));

import { POST } from "@/app/api/auth/2fa/setup/route";

describe("POST /api/auth/2fa/setup", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
  });

  it("returns 401 when not authenticated", async () => {
    const req = createRequest("POST", "/api/auth/2fa/setup");
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(401);
  });

  it("returns qrCode and otpauthUri on successful setup", async () => {
    await setSessionCookie(testSession);
    mockUpdateResult.mockResolvedValue([]);
    const req = createRequest("POST", "/api/auth/2fa/setup");
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.otpauthUri).toContain("otpauth://totp/");
    expect(body.data.otpauthUri).toContain("MOCKSECRET");
    expect(body.data.qrCode).toContain("data:image/png");
  });
});
