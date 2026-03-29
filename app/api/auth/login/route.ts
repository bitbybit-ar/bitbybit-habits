import { NextResponse } from "next/server";
import { apiHandler, BadRequestError, ForbiddenError, UnauthorizedError, RateLimitError } from "@/lib/api";
import { users, familyMembers } from "@/lib/db";
import { verifyPassword, createSession, createTempToken } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { eq, or } from "drizzle-orm";
import type { ApiResponse } from "@/lib/types";

// Rate limiter: 5 attempts per 15 minutes per IP
const loginRateLimiter = createRateLimiter(5, 15 * 60 * 1000);

/**
 * POST /api/auth/login
 *
 * Authenticate user with email/username + password. Rate limited (5/15min).
 * Returns a temp token for 2FA validation if TOTP is enabled.
 */
export const POST = apiHandler(async (request, { db }) => {
  const clientIp = getClientIp(request);
  const rateLimitResult = loginRateLimiter.check(clientIp);

  if (!rateLimitResult.success) {
    throw new RateLimitError(rateLimitResult.retryAfterMs ?? 0);
  }

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

  // Nostr-only accounts have no password
  if (!user.password_hash) {
    throw new UnauthorizedError("nostr_only_account");
  }

  const valid = await verifyPassword(password, user.password_hash);

  if (!valid) {
    const newFailedAttempts = (user.failed_login_attempts ?? 0) + 1;
    const shouldLock = newFailedAttempts >= 10;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + 30 * 60 * 1000)
      : null;

    await db
      .update(users)
      .set({
        failed_login_attempts: newFailedAttempts,
        locked_until: lockedUntil,
      })
      .where(eq(users.id, user.id));

    if (shouldLock) {
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
}, { auth: false });
