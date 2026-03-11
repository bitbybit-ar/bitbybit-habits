/**
 * Shared DB mock utilities.
 * Individual test files define their own vi.mock("@/lib/db", ...) to avoid
 * issues with hoisting and module resolution.
 * This file provides helper types and utilities only.
 */

export interface MockQuery {
  operation: "select" | "insert" | "update" | "delete";
  table?: string;
  values?: unknown;
  where?: unknown;
  returning?: boolean;
}

export const mockQueries: MockQuery[] = [];

export function resetMockDb() {
  mockQueries.length = 0;
}
