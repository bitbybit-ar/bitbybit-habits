import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { apiHandler, BadRequestError, UnauthorizedError, RateLimitError } from "@/lib/api";
import { users, familyMembers } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { validateAuthEvent } from "@/lib/nostr";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { eq } from "drizzle-orm";
import type { ApiResponse } from "@/lib/types";
import type { NostrEvent } from "@/lib/nostr";

const nostrRateLimiter = createRateLimiter(5, 15 * 60 * 1000);

/**
 * GET /api/auth/nostr
 *
 * Issue a random challenge for NIP-42 authentication.
 * The challenge is stored in an httpOnly cookie (5 min expiry).
 */
export async function GET() {
  const challenge = randomBytes(32).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set("nostr_challenge", challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300, // 5 minutes
    path: "/",
  });

  return NextResponse.json<ApiResponse>({
    success: true,
    data: { challenge },
  });
}

/**
 * POST /api/auth/nostr
 *
 * Verify a NIP-42 signed event and authenticate.
 * Creates user if first-time Nostr login.
 */
export const POST = apiHandler(async (request, { db }) => {
  const clientIp = getClientIp(request);
  const rateLimitResult = nostrRateLimiter.check(clientIp);
  if (!rateLimitResult.success) {
    throw new RateLimitError(rateLimitResult.retryAfterMs ?? 0);
  }

  const cookieStore = await cookies();
  const challenge = cookieStore.get("nostr_challenge")?.value;
  if (!challenge) {
    throw new BadRequestError("no_challenge");
  }

  const { signedEvent } = (await request.json()) as { signedEvent: NostrEvent };
  if (!signedEvent) {
    throw new BadRequestError("missing_fields");
  }

  const valid = validateAuthEvent(signedEvent, challenge);
  if (!valid) {
    throw new UnauthorizedError("invalid_nostr_signature");
  }

  const pubkey = signedEvent.pubkey;

  // Find existing user by nostr_pubkey
  const existing = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      display_name: users.display_name,
      locale: users.locale,
      nostr_pubkey: users.nostr_pubkey,
    })
    .from(users)
    .where(eq(users.nostr_pubkey, pubkey))
    .limit(1);

  let user = existing[0];
  let isNewUser = false;

  if (!user) {
    // Auto-create user for first-time Nostr login
    const pubkeyShort = pubkey.slice(0, 12);
    const pubkeyShort8 = pubkey.slice(0, 8);

    const inserted = await db
      .insert(users)
      .values({
        email: `nostr_${pubkeyShort}@bitbybit.nostr`,
        username: `nostr_${pubkeyShort8}`,
        display_name: `Nostr ${pubkeyShort8}`,
        nostr_pubkey: pubkey,
        auth_provider: "nostr",
        locale: "es",
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        display_name: users.display_name,
        locale: users.locale,
        nostr_pubkey: users.nostr_pubkey,
      });

    user = inserted[0];
    isNewUser = true;
  }

  // Get role from family membership
  const memberResult = await db
    .select({ role: familyMembers.role })
    .from(familyMembers)
    .where(eq(familyMembers.user_id, user.id))
    .orderBy(familyMembers.joined_at)
    .limit(1);

  const role = (memberResult[0]?.role as "sponsor" | "kid") ?? null;

  const token = await createSession({
    user_id: user.id,
    email: user.email,
    username: user.username,
    display_name: user.display_name,
    locale: user.locale as "es" | "en",
    role,
    nostr_pubkey: user.nostr_pubkey,
  });

  const response = NextResponse.json<ApiResponse>({
    success: true,
    data: {
      user_id: user.id,
      email: user.email,
      username: user.username,
      display_name: user.display_name,
      locale: user.locale,
      role,
      nostr_pubkey: user.nostr_pubkey,
      isNewUser,
    },
  });

  response.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  // Clear the challenge cookie
  response.cookies.set("nostr_challenge", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}, { auth: false });
