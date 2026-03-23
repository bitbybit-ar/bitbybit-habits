// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { parseResponse, setSessionCookie, clearSessionCookie, testSession } from "../../helpers";
import { GET } from "@/app/api/auth/session/route";

describe("GET /api/auth/session", () => {
  beforeEach(async () => {
    await clearSessionCookie();
  });

  it("returns 401 when no session cookie", async () => {
    const { status, body } = await parseResponse(await GET());
    expect(status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns session data when authenticated", async () => {
    await setSessionCookie(testSession);
    const { status, body } = await parseResponse(await GET());
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.user_id).toBe(testSession.user_id);
    expect(body.data.email).toBe(testSession.email);
  });
});
