import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import { TextEncoder, TextDecoder } from "util";

// Set environment variables for tests
process.env.AUTH_SECRET = "test-secret-key-for-testing-only-do-not-use-in-production";

// Polyfill TextEncoder/TextDecoder for jsdom environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

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
