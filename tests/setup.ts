import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Set environment variables for tests
process.env.AUTH_SECRET = "test-secret-key-for-testing-only-do-not-use-in-production";

// Polyfill TextEncoder/TextDecoder only for jsdom (node already has them natively)
if (typeof globalThis.TextEncoder === "undefined") {
  const { TextEncoder, TextDecoder } = require("util");
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder as typeof global.TextDecoder;
}

// Mock lib/auth — bypass jose JWT signing/verification in tests
// Tests that need custom auth mocking (e.g. login.test.ts) will override this
vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual("@/lib/auth");
  return {
    ...actual,
    createSession: vi.fn(async (session: Record<string, unknown>) => {
      return Buffer.from(JSON.stringify(session)).toString("base64url");
    }),
    createTempToken: vi.fn(async () => "mock-temp-token"),
    getSession: vi.fn(async () => {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const token = (
        cookieStore as unknown as {
          get: (n: string) => { value: string } | undefined;
        }
      ).get("session")?.value;
      if (!token) return null;
      try {
        return JSON.parse(Buffer.from(token, "base64url").toString());
      } catch {
        return null;
      }
    }),
  };
});

// Mock next/headers (cookies)
vi.mock("next/headers", () => {
  const cookieStore = new Map<string, { value: string }>();
  return {
    cookies: vi.fn(async () => ({
      get: (name: string) => cookieStore.get(name),
      set: (name: string, value: string, _opts?: Record<string, unknown>) => {
        if (value === "") cookieStore.delete(name);
        else cookieStore.set(name, { value });
      },
      delete: (name: string) => cookieStore.delete(name),
      _store: cookieStore, // exposed for test manipulation
    })),
  };
});

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/en/dashboard",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));
