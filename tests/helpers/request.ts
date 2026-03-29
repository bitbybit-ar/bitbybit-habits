/**
 * Helpers to create NextRequest objects and manage session cookies for API tests.
 */
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import type { AuthSession } from "@/lib/types";

const BASE_URL = "http://localhost:3000";

export function createRequest(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  searchParams?: Record<string, string>
): NextRequest {
  const url = new URL(path, BASE_URL);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) url.searchParams.set(k, v);
  }

  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextRequest(url, init as any);
}

export const testSession: AuthSession = {
  user_id: "00000000-0000-0000-0000-000000000001",
  email: "test@example.com",
  username: "testuser",
  display_name: "Test User",
  locale: "en",
  role: "sponsor",
  nostr_pubkey: null,
};

export const kidSession: AuthSession = {
  user_id: "00000000-0000-0000-0000-000000000002",
  email: "kid@example.com",
  username: "kiduser",
  display_name: "Kid User",
  locale: "en",
  role: "kid",
  nostr_pubkey: null,
};

/**
 * Sets a session cookie so getSession() returns the given session.
 * We store a base64-encoded JSON token. The global getSession mock
 * (see setup-api.ts) reads this directly without JWT verification,
 * avoiding jose's cross-realm Uint8Array issues in jsdom.
 */
export async function setSessionCookie(session: AuthSession) {
  const token = Buffer.from(JSON.stringify(session)).toString("base64url");
  const cookieStore = await cookies();
  (cookieStore as unknown as { set: (n: string, v: string) => void }).set("session", token);
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  (cookieStore as unknown as { delete: (n: string) => void }).delete("session");
}

export async function parseResponse(response: Response) {
  const json = await response.json();
  return { status: response.status, body: json };
}

// Common UUIDs for test data
export const UUID = {
  user1: "00000000-0000-0000-0000-000000000001",
  user2: "00000000-0000-0000-0000-000000000002",
  user3: "00000000-0000-0000-0000-000000000003",
  family1: "00000000-0000-0000-0000-000000000010",
  habit1: "00000000-0000-0000-0000-000000000020",
  completion1: "00000000-0000-0000-0000-000000000030",
  payment1: "00000000-0000-0000-0000-000000000040",
  wallet1: "00000000-0000-0000-0000-000000000050",
  notification1: "00000000-0000-0000-0000-000000000060",
};
