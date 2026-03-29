// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRequest, parseResponse } from "../../helpers";

// Mock rate limiter — real implementation is disabled in non-production
let rateLimitCallCount = 0;
vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: (max: number) => ({
    check: () => {
      rateLimitCallCount++;
      if (rateLimitCallCount > max) {
        return { success: false, remaining: 0, retryAfterMs: 60000 };
      }
      return { success: true, remaining: max - rateLimitCallCount };
    },
  }),
}));

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  hash: vi.fn(async (pw: string) => `hashed_${pw}`),
  compare: vi.fn(async (pw: string, hash: string) => hash === `hashed_${pw}`),
}));

// Mock lib/auth - mock the createSession function instead of jose
vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual("@/lib/auth");
  return {
    ...actual,
    createSession: vi.fn(async () => "mock-jwt-token"),
  };
});

// Mock lib/db
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();

function chainSelect() {
  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockWhere.mockReturnValue({ limit: mockLimit, orderBy: mockOrderBy, returning: vi.fn() });
  mockOrderBy.mockReturnValue({ limit: mockLimit });
  mockSet.mockReturnValue({ where: mockWhere });
}

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: mockSelect,
    selectDistinct: mockSelect,
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(async () => []) })) })),
    update: mockUpdate,
    delete: vi.fn(() => ({ where: vi.fn(async () => {}) })),
  }),
  users: {
    id: "id",
    email: "email",
    username: "username",
    password_hash: "password_hash",
    display_name: "display_name",
    locale: "locale",
    failed_login_attempts: "failed_login_attempts",
    locked_until: "locked_until",
  },
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
    rateLimitCallCount = 0;
    chainSelect();
    mockUpdate.mockReturnValue({ set: mockSet });
  });

  it("returns 400 when login or password is missing", async () => {
    const req = createRequest("POST", "/api/auth/login", { login: "" });
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("returns 401 when user is not found", async () => {
    mockLimit.mockResolvedValue([]);
    // Use unique IP to avoid rate limiting from other tests
    const req = createRequest("POST", "/api/auth/login", { login: "nobody@test.com", password: "pass123" });
    req.headers.set("x-forwarded-for", "10.0.0.1");
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toContain("invalid_credentials");
  });

  it("returns 403 when account is locked", async () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes from now
    mockLimit.mockResolvedValueOnce([
      {
        id: "u1",
        email: "test@test.com",
        username: "test",
        password_hash: "hashed_correct",
        display_name: "Test",
        locale: "en",
        failed_login_attempts: 10,
        locked_until: futureDate,
      },
    ]);
    const req = createRequest("POST", "/api/auth/login", {
      login: "test@test.com",
      password: "correct",
    });
    req.headers.set("x-forwarded-for", "10.0.0.2");
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toContain("account_locked");
  });

  it("increments failed attempts on wrong password", async () => {
    mockLimit.mockResolvedValueOnce([
      {
        id: "u1",
        email: "test@test.com",
        username: "test",
        password_hash: "hashed_correct",
        display_name: "Test",
        locale: "en",
        failed_login_attempts: 3,
        locked_until: null,
      },
    ]);

    const req = createRequest("POST", "/api/auth/login", {
      login: "test@test.com",
      password: "wrong",
    });
    req.headers.set("x-forwarded-for", "10.0.0.3");
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(401);
    expect(body.success).toBe(false);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("locks account after 10 failed attempts", async () => {
    mockLimit.mockResolvedValueOnce([
      {
        id: "u1",
        email: "test@test.com",
        username: "test",
        password_hash: "hashed_correct",
        display_name: "Test",
        locale: "en",
        failed_login_attempts: 9,
        locked_until: null,
      },
    ]);

    const req = createRequest("POST", "/api/auth/login", {
      login: "test@test.com",
      password: "wrong",
    });
    req.headers.set("x-forwarded-for", "10.0.0.4");
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toContain("too_many_attempts");
  });

  it("returns 200 with user data and session cookie on success", async () => {
    mockLimit
      .mockResolvedValueOnce([
        {
          id: "u1",
          email: "test@test.com",
          username: "test",
          password_hash: "hashed_correct",
          display_name: "Test",
          locale: "en",
          failed_login_attempts: 0,
          locked_until: null,
        },
      ])
      .mockResolvedValueOnce([{ role: "sponsor" }]); // family membership query

    const req = createRequest("POST", "/api/auth/login", {
      login: "test@test.com",
      password: "correct",
    });
    req.headers.set("x-forwarded-for", "10.0.0.5");
    const response = await POST(req);
    const { status, body } = await parseResponse(response);

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.email).toBe("test@test.com");
    expect(body.data.role).toBe("sponsor");
    // Check session cookie was set
    const setCookie = response.headers.getSetCookie();
    expect(setCookie.some((c: string) => c.includes("session="))).toBe(true);
    // Check that failed attempts were reset
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("resets failed attempts on successful login", async () => {
    mockLimit
      .mockResolvedValueOnce([
        {
          id: "u1",
          email: "test@test.com",
          username: "test",
          password_hash: "hashed_pass",
          display_name: "Test",
          locale: "en",
          failed_login_attempts: 5,
          locked_until: null,
        },
      ])
      .mockResolvedValueOnce([]); // no family membership

    const req = createRequest("POST", "/api/auth/login", {
      login: "test@test.com",
      password: "pass",
    });
    req.headers.set("x-forwarded-for", "10.0.0.6");
    const { status, body } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(body.data.role).toBeNull();
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("returns 429 when rate limit is exceeded", async () => {
    // Make 6 requests rapidly to exceed the rate limit (5 per 15 min)
    // All from the same IP
    const testIp = "10.0.0.100";
    mockLimit.mockResolvedValue([]);

    let lastResponse;
    for (let i = 0; i < 6; i++) {
      const req = createRequest("POST", "/api/auth/login", {
        login: "test@test.com",
        password: "pass",
      });
      req.headers.set("x-forwarded-for", testIp);
      lastResponse = await POST(req);
    }

    const { status, body } = await parseResponse(lastResponse!);
    expect(status).toBe(429);
    expect(body.success).toBe(false);
    expect(body.error).toContain("Too many requests");
  });
});
