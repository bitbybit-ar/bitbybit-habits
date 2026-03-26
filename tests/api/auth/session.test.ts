// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession } from "../../helpers";

vi.mock("@/lib/db", () => ({
  getDb: () => ({}),
  familyMembers: { user_id: "u", role: "r" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}));

import { GET } from "@/app/api/auth/session/route";

describe("GET /api/auth/session", () => {
  beforeEach(async () => {
    await clearSessionCookie();
  });

  it("returns 401 when no session cookie", async () => {
    const req = createRequest("GET", "/api/auth/session");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns session data when authenticated", async () => {
    await setSessionCookie(testSession);
    const req = createRequest("GET", "/api/auth/session");
    const { status, body } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.user_id).toBe(testSession.user_id);
    expect(body.data.email).toBe(testSession.email);
  });
});
