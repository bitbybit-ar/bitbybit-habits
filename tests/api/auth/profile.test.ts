import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse, setSessionCookie, clearSessionCookie, testSession } from "../../helpers";

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockWhereUpdate = vi.fn();
const mockReturning = vi.fn();

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: mockSelect,
    update: mockUpdate,
  }),
  users: { id: "id", email: "email", username: "username", display_name: "display_name", avatar_url: "avatar_url", locale: "locale" },
  familyMembers: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...a: unknown[]) => a),
  or: vi.fn(), and: vi.fn(), desc: vi.fn(), asc: vi.fn(),
}));

import { GET, PATCH } from "@/app/api/auth/profile/route";

describe("/api/auth/profile", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearSessionCookie();
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhereUpdate });
    mockWhereUpdate.mockReturnValue({ returning: mockReturning });
  });

  describe("GET", () => {
    it("returns 401 without session", async () => {
      const req = createRequest("GET", "/api/auth/profile");
      const { status } = await parseResponse(await GET(req, undefined as never));
      expect(status).toBe(401);
    });

    it("returns user profile when authenticated", async () => {
      await setSessionCookie(testSession);
      mockWhere.mockResolvedValue([{
        id: testSession.user_id, email: "test@example.com",
        username: "testuser", display_name: "Test User",
        avatar_url: null, locale: "en",
      }]);

      const req = createRequest("GET", "/api/auth/profile");
      const { status, body } = await parseResponse(await GET(req, undefined as never));
      expect(status).toBe(200);
      expect(body.data.username).toBe("testuser");
    });

    it("returns 404 when user not in DB", async () => {
      await setSessionCookie(testSession);
      mockWhere.mockResolvedValue([]);

      const req = createRequest("GET", "/api/auth/profile");
      const { status } = await parseResponse(await GET(req, undefined as never));
      expect(status).toBe(404);
    });
  });

  describe("PATCH", () => {
    it("returns 401 without session", async () => {
      const req = createRequest("PATCH", "/api/auth/profile", { display_name: "New" });
      const { status } = await parseResponse(await PATCH(req, undefined as never));
      expect(status).toBe(401);
    });

    it("updates profile fields", async () => {
      await setSessionCookie(testSession);
      mockReturning.mockResolvedValue([{
        id: testSession.user_id, email: "test@example.com",
        username: "testuser", display_name: "New Name",
        avatar_url: null, locale: "en",
      }]);

      const req = createRequest("PATCH", "/api/auth/profile", { display_name: "New Name" });
      const { status, body } = await parseResponse(await PATCH(req, undefined as never));
      expect(status).toBe(200);
      expect(body.data.display_name).toBe("New Name");
    });

    it("returns 400 for invalid locale", async () => {
      await setSessionCookie(testSession);
      const req = createRequest("PATCH", "/api/auth/profile", { locale: "fr" });
      const { status } = await parseResponse(await PATCH(req, undefined as never));
      expect(status).toBe(400);
    });

    it("returns 400 for short username", async () => {
      await setSessionCookie(testSession);
      const req = createRequest("PATCH", "/api/auth/profile", { username: "ab" });
      const { status } = await parseResponse(await PATCH(req, undefined as never));
      expect(status).toBe(400);
    });

    it("returns 400 for invalid email", async () => {
      await setSessionCookie(testSession);
      const req = createRequest("PATCH", "/api/auth/profile", { email: "not-an-email" });
      const { status } = await parseResponse(await PATCH(req, undefined as never));
      expect(status).toBe(400);
    });
  });
});
