import { NextResponse } from "next/server";
import { getDb, users } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";
import type { ApiResponse } from "@/lib/types";

// Rate limiter: 3 attempts per 15 minutes per IP
const registerRateLimiter = createRateLimiter(3, 15 * 60 * 1000);

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
    const rateLimitResult = registerRateLimiter.check(clientIp);

    if (!rateLimitResult.success) {
      const retryAfterSeconds = Math.ceil((rateLimitResult.retryAfterMs ?? 0) / 1000);
      const response = NextResponse.json<ApiResponse>(
        { success: false, error: "Demasiados intentos. Intenta de nuevo mas tarde" },
        { status: 429 }
      );
      response.headers.set("Retry-After", retryAfterSeconds.toString());
      return response;
    }

    const { email, username, password, display_name, locale } =
      await request.json();

    if (!email || !username || !password || !display_name) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    const db = getDb();
    const password_hash = await hashPassword(password);

    const emailLower = email.toLowerCase();
    const usernameLower = username.toLowerCase();
    const userLocale = locale ?? "es";

    const result = await db
      .insert(users)
      .values({
        email: emailLower,
        username: usernameLower,
        password_hash,
        display_name,
        locale: userLocale,
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        display_name: users.display_name,
        locale: users.locale,
        created_at: users.created_at,
      });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result[0],
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al registrar";
    const isDuplicate = message.includes("duplicate key") || message.includes("unique");

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: isDuplicate
          ? "El email o nombre de usuario ya existe"
          : message,
      },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}
