import { NextResponse } from "next/server";
import { getDb, users, familyMembers } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { eq, or } from "drizzle-orm";
import type { ApiResponse } from "@/lib/types";

export async function POST(request: Request) {
  try {
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
    const valid = await verifyPassword(password, user.password_hash);

    if (!valid) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Credenciales invalidas" },
        { status: 401 }
      );
    }

    // Get user's role from their first family membership
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
