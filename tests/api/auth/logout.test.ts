// @vitest-environment node
import { describe, it, expect } from "vitest";
import { parseResponse } from "../../helpers";
import { POST } from "@/app/api/auth/logout/route";

describe("POST /api/auth/logout", () => {
  it("returns success and clears session cookie", async () => {
    const response = await POST();
    const { status, body } = await parseResponse(response);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    // Cookie should be set with maxAge=0
    const setCookie = response.headers.getSetCookie();
    expect(setCookie.some((c: string) => c.includes("session=") && c.includes("Max-Age=0"))).toBe(true);
  });
});
