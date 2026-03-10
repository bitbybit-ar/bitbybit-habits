import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import type { ApiResponse, User } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { login, password } = await request.json();

    if (!login || !password) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    await initDb();
    const db = getDb();
    const loginLower = login.trim().toLowerCase();

    // Try email first, then username — avoids OR parameterization edge cases with Neon
    let result = await db`
      SELECT id, email, username, password_hash, display_name, locale
      FROM users
      WHERE LOWER(TRIM(email)) = ${loginLower}
    `;

    if (result.length === 0) {
      result = await db`
        SELECT id, email, username, password_hash, display_name, locale
        FROM users
        WHERE LOWER(TRIM(username)) = ${loginLower}
      `;
    }

    if (result.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Credenciales invalidas" },
        { status: 401 }
      );
    }

    const user = result[0] as User;
    const valid = await verifyPassword(password, user.password_hash);

    if (!valid) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Credenciales invalidas" },
        { status: 401 }
      );
    }

    const token = await createSession({
      user_id: user.id,
      email: user.email,
      username: user.username,
      display_name: user.display_name,
      locale: user.locale as "es" | "en",
    });

    const response = NextResponse.json<ApiResponse>({
      success: true,
      data: {
        user_id: user.id,
        email: user.email,
        username: user.username,
        display_name: user.display_name,
        locale: user.locale,
      },
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
    const message =
      error instanceof Error ? error.message : "Error al iniciar sesion";
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
