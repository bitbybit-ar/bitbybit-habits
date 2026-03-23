import { NextResponse } from "next/server";
import { getDb, users, familyMembers } from "@/lib/db";
import { verifyPassword, createSession, createTempToken } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";
import { eq, or } from "drizzle-orm";
import type { ApiResponse } from "@/lib/types";

// Rate limiter: 5 attempts per 15 minutes per IP
const loginRateLimiter = createRateLimiter(5, 15 * 60 * 1000);

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return "unknown";
}

export async function POST(request: Request) {
  try {
    // Check rate limit
    const clientIp = getClientIp(request);
    const rateLimitResult = loginRateLimiter.check(clientIp);

    if (!rateLimitResult.success) {
      const retryAfterSeconds = Math.ceil((rateLimitResult.retryAfterMs ?? 0) / 1000);
      const response = NextResponse.json<ApiResponse>(
        { success: false, error: "Demasiados intentos. Intenta de nuevo mas tarde" },
        { status: 429 }
      );
      response.headers.set("Retry-After", retryAfterSeconds.toString());
      return response;
    }

    const { login, password } = await request.json();

    if (!login || !password) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    const db = getDb();
    const loginLower = login.trim().toLowerCase();

    const result = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        password_hash: users.password_hash,
        display_name: users.display_name,
        locale: users.locale,
        failed_login_attempts: users.failed_login_attempts,
        locked_until: users.locked_until,
        totp_enabled: users.totp_enabled,
      })
      .from(users)
      .where(or(eq(users.email, loginLower), eq(users.username, loginLower)))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Credenciales invalidas" },
        { status: 401 }
      );
    }

    const user = result[0];

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Cuenta temporalmente bloqueada. Intenta de nuevo mas tarde" },
        { status: 403 }
      );
    }

    const valid = await verifyPassword(password, user.password_hash);

    if (!valid) {
      // Increment failed login attempts
      const newFailedAttempts = (user.failed_login_attempts ?? 0) + 1;
      const shouldLock = newFailedAttempts >= 10;
      const lockedUntil = shouldLock
        ? new Date(Date.now() + 30 * 60 * 1000) // Lock for 30 minutes
        : null;

      await db
        .update(users)
        .set({
          failed_login_attempts: newFailedAttempts,
          locked_until: lockedUntil,
        })
        .where(eq(users.id, user.id));

      if (shouldLock) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Cuenta bloqueada por demasiados intentos fallidos" },
          { status: 403 }
        );
      }

      return NextResponse.json<ApiResponse>(
        { success: false, error: "Credenciales invalidas" },
        { status: 401 }
      );
    }

    // Reset failed login attempts on successful login
    await db
      .update(users)
      .set({
        failed_login_attempts: 0,
        locked_until: null,
      })
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
      // Create temporary token for 2FA validation
      const tempToken = await createTempToken(user.id, "2fa");

      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          requires2FA: true,
          tempToken,
        },
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
    });

    const responseData: Record<string, unknown> = {
      user_id: user.id,
      email: user.email,
      username: user.username,
      display_name: user.display_name,
      locale: user.locale,
      role,
    };

    // Sponsor enforcement: require 2FA setup
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
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    console.error("[Login Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al iniciar sesion" },
      { status: 500 }
    );
  }
}
