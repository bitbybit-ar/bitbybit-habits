import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse } from "../../helpers";

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  hash: vi.fn(async (pw: string) => `hashed_${pw}`),
  compare: vi.fn(async (pw: string, hash: string) => hash === `hashed_${pw}`),
}));

// Mock lib/db
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();

function chainSelect() {
  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockWhere.mockReturnValue({ limit: mockLimit, orderBy: mockOrderBy });
  mockOrderBy.mockReturnValue({ limit: mockLimit });
}

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: mockSelect,
    selectDistinct: mockSelect,
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(async () => []) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn(async () => []) })) })) })),
    delete: vi.fn(() => ({ where: vi.fn(async () => {}) })),
  }),
  users: { id: "id", email: "email", username: "username", password_hash: "password_hash", display_name: "display_name", locale: "locale" },
  familyMembers: { user_id: "user_id", family_id: "family_id", role: "role", joined_at: "joined_at", id: "id" },
  families: {},
  habits: {},
  completions: {},
  payments: {},
  wallets: {},
  notifications: {},
  habitAssignments: {},
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => args),
  or: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  isNull: vi.fn(),
  isNotNull: vi.fn(),
  desc: vi.fn(),
  asc: vi.fn(),
  ne: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  sum: vi.fn(),
  count: vi.fn(),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

import { POST } from "@/app/api/auth/login/route";

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chainSelect();
  });

  it("returns 400 when login or password is missing", async () => {
    const req = createRequest("POST", "/api/auth/login", { login: "" });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("returns 401 when user is not found", async () => {
    mockLimit.mockResolvedValue([]);
    const req = createRequest("POST", "/api/auth/login", { login: "nobody@test.com", password: "pass123" });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toContain("Credenciales");
  });

  it("returns 401 when password is wrong", async () => {
    mockLimit
      .mockResolvedValueOnce([{
        id: "u1", email: "test@test.com", username: "test",
        password_hash: "hashed_correct", display_name: "Test", locale: "en",
      }]);
    const req = createRequest("POST", "/api/auth/login", { login: "test@test.com", password: "wrong" });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 200 with user data and session cookie on success", async () => {
    mockLimit
      .mockResolvedValueOnce([{
        id: "u1", email: "test@test.com", username: "test",
        password_hash: "hashed_correct", display_name: "Test", locale: "en",
      }])
      .mockResolvedValueOnce([{ role: "sponsor" }]); // family membership query

    const req = createRequest("POST", "/api/auth/login", { login: "test@test.com", password: "correct" });
    const response = await POST(req);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.email).toBe("test@test.com");
    expect(body.data.role).toBe("sponsor");
    // Check session cookie was set
    const setCookie = response.headers.getSetCookie();
    expect(setCookie.some((c: string) => c.includes("session="))).toBe(true);
  });

  it("returns 200 with null role when user has no family", async () => {
    mockLimit
      .mockResolvedValueOnce([{
        id: "u1", email: "test@test.com", username: "test",
        password_hash: "hashed_pass", display_name: "Test", locale: "en",
      }])
      .mockResolvedValueOnce([]); // no family membership

    const req = createRequest("POST", "/api/auth/login", { login: "test@test.com", password: "pass" });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(body.data.role).toBeNull();
  });
});
