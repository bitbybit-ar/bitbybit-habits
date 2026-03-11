import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse } from "../../helpers";

vi.mock("bcryptjs", () => ({
  hash: vi.fn(async (pw: string) => `hashed_${pw}`),
  compare: vi.fn(),
}));

const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    insert: mockInsert,
  }),
  users: {},
  familyMembers: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(), or: vi.fn(), and: vi.fn(),
}));

import { POST } from "@/app/api/auth/register/route";

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockReturnValue({ returning: mockReturning });
  });

  it("returns 400 when required fields are missing", async () => {
    const req = createRequest("POST", "/api/auth/register", { email: "a@b.com" });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("returns 200 with user data on successful registration", async () => {
    mockReturning.mockResolvedValue([{
      id: "new-id", email: "test@test.com", username: "testuser",
      display_name: "Test", locale: "es", created_at: new Date().toISOString(),
    }]);

    const req = createRequest("POST", "/api/auth/register", {
      email: "Test@Test.com", username: "TestUser", password: "pass123", display_name: "Test",
    });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.email).toBe("test@test.com");
  });

  it("returns 409 on duplicate email/username", async () => {
    mockReturning.mockRejectedValue(new Error("duplicate key value violates unique constraint"));

    const req = createRequest("POST", "/api/auth/register", {
      email: "dup@test.com", username: "dup", password: "pass", display_name: "Dup",
    });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(409);
    expect(body.error).toContain("ya existe");
  });
});
