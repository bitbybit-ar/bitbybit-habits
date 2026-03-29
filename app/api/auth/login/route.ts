import { NextResponse } from "next/server";
import { apiHandler, BadRequestError, ForbiddenError, UnauthorizedError } from "@/lib/api";
import { users, familyMembers } from "@/lib/db";
import { verifyPassword, createSession, createTempToken } from "@/lib/auth";
import { eq, or, sql } from "drizzle-orm";
import type { ApiResponse } from "@/lib/types";

/**
 * POST /api/auth/login
 *
 * Authenticate user with email/username + password. Rate limited (strict: 5/15min).
 * Returns a temp token for 2FA validation if TOTP is enabled.
 */
export const POST = apiHandler(async (request, { db }) => {
  const { login, password } = await request.json();

  if (!login || !password) {
    throw new BadRequestError("missing_fields");
  }

  const loginLower = login.trim().toLowerCase();

  const result = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      password_hash: users.password_hash,
      display_name: users.display_name,
      locale: users.locale,
      nostr_pubkey: users.nostr_pubkey,
      failed_login_attempts: users.failed_login_attempts,
      locked_until: users.locked_until,
      totp_enabled: users.totp_enabled,
    })
    .from(users)
    .where(or(eq(users.email, loginLower), eq(users.username, loginLower)))
    .limit(1);

  if (result.length === 0) {
    throw new UnauthorizedError("invalid_credentials");
  }

  const user = result[0];

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new ForbiddenError("account_locked");
  }

  // Nostr-only accounts have no password — return same error to prevent account enumeration
  if (!user.password_hash) {
    throw new UnauthorizedError("invalid_credentials");
  }

  const valid = await verifyPassword(password, user.password_hash);

  if (!valid) {
    // Atomic increment to prevent race conditions with concurrent failed logins
    await db
      .update(users)
      .set({
        failed_login_attempts: sql`COALESCE(${users.failed_login_attempts}, 0) + 1`,
        locked_until: sql`CASE WHEN COALESCE(${users.failed_login_attempts}, 0) + 1 >= 10 THEN NOW() + INTERVAL '30 minutes' ELSE ${users.locked_until} END`,
      })
      .where(eq(users.id, user.id));

    const newFailedAttempts = (user.failed_login_attempts ?? 0) + 1;
    if (newFailedAttempts >= 10) {
      throw new ForbiddenError("too_many_attempts");
    }

    throw new UnauthorizedError("invalid_credentials");
  }

  // Reset failed login attempts on successful login
  await db
    .update(users)
    .set({ failed_login_attempts: 0, locked_until: null })
    .where(eq(users.id, user.id));

  // Get user's role from their first family membership
  const memberResult = await db
    .select({ role: familyMembers.role })
    .from(familyMembers)
    .where(eq(familyMembers.user_id, user.id))
    .orderBy(familyMembers.joined_at)
    .limit(1);

  const role = (memberResult[0]?.role as "sponsor" | "kid") ?? null;

  // Check if 2FA is enabled
  if (user.totp_enabled) {
    const tempToken = await createTempToken(user.id, "2fa");

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { requires2FA: true, tempToken },
    });
  }

  // Normal login flow (no 2FA)
  const token = await createSession({
    user_id: user.id,
    email: user.email,
    username: user.username,
    display_name: user.display_name,
    locale: user.locale as "es" | "en",
    role,
    nostr_pubkey: user.nostr_pubkey ?? null,
  });

  const responseData: Record<string, unknown> = {
    user_id: user.id,
    email: user.email,
    username: user.username,
    display_name: user.display_name,
    locale: user.locale,
    role,
  };

  if (role === "sponsor" && !user.totp_enabled) {
    responseData.requires2FASetup = true;
  }

  const response = NextResponse.json<ApiResponse>({
    success: true,
    data: responseData,
  });

  response.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}, { auth: false, rateLimit: "strict" });
