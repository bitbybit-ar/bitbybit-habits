import { NextResponse } from "next/server";
import { apiHandler, requireFields, BadRequestError } from "@/lib/api";
import { users, familyMembers } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { TOTP } from "otpauth";
import { jwtVerify } from "jose";
import type { ApiResponse } from "@/lib/types";

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export const POST = apiHandler(async (request, { db }) => {
  const body = await request.json();
  const { tempToken, code } = body as { tempToken: string; code: string };

  requireFields({ tempToken, code }, ["tempToken", "code"]);

  // Verify temp token
  let userId: string;
  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(tempToken, secret);

    if (payload.purpose !== "2fa") {
      throw new BadRequestError("invalid_token");
    }

    userId = payload.user_id as string;
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    throw new BadRequestError("token_expired");
  }

  // Get user data
  const result = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      display_name: users.display_name,
      locale: users.locale,
      totp_secret: users.totp_secret,
      totp_enabled: users.totp_enabled,
      recovery_codes: users.recovery_codes,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (result.length === 0 || !result[0].totp_enabled || !result[0].totp_secret) {
    throw new BadRequestError("2fa_not_enabled");
  }

  const user = result[0];
  let isValid = false;
  let isRecoveryCode = false;

  // Try TOTP code first
  const totp = new TOTP({
    issuer: "BitByBit",
    label: user.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: user.totp_secret!,
  });

  const delta = totp.validate({ token: code, window: 1 });

  if (delta !== null) {
    isValid = true;
  } else if (user.recovery_codes) {
    // Try recovery codes
    const recoveryCodes = JSON.parse(user.recovery_codes) as string[];

    for (let i = 0; i < recoveryCodes.length; i++) {
      const match = await verifyPassword(code, recoveryCodes[i]);
      if (match) {
        isValid = true;
        isRecoveryCode = true;

        // Remove used recovery code
        recoveryCodes.splice(i, 1);
        await db
          .update(users)
          .set({ recovery_codes: JSON.stringify(recoveryCodes) })
          .where(eq(users.id, user.id));
        break;
      }
    }
  }

  if (!isValid) {
    throw new BadRequestError("invalid_code");
  }

  // Get user's role from their first family membership
  const memberResult = await db
    .select({ role: familyMembers.role })
    .from(familyMembers)
    .where(eq(familyMembers.user_id, user.id))
    .orderBy(familyMembers.joined_at)
    .limit(1);

  const role = (memberResult[0]?.role as "sponsor" | "kid") ?? null;

  // Create full session token
  const sessionToken = await createSession({
    user_id: user.id,
    email: user.email,
    username: user.username,
    display_name: user.display_name,
    locale: user.locale as "es" | "en",
    role,
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
      isRecoveryCode,
    },
  });

  response.cookies.set("session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    path: "/",
  });

  return response;
}, { auth: false });
