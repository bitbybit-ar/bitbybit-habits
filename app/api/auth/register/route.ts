import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import type { ApiResponse, User } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { email, username, password, display_name, locale } =
      await request.json();

    if (!email || !username || !password || !display_name) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    await initDb();
    const db = getDb();
    const password_hash = await hashPassword(password);

    const emailLower = email.toLowerCase();
    const usernameLower = username.toLowerCase();
    const userLocale = locale ?? "es";

    const result = await db`
      INSERT INTO users (email, username, password_hash, display_name, locale)
      VALUES (${emailLower}, ${usernameLower}, ${password_hash}, ${display_name}, ${userLocale})
      RETURNING id, email, username, display_name, locale, created_at
    `;

    const user = result[0] as Omit<User, "password_hash">;

    return NextResponse.json<ApiResponse>({
      success: true,
      data: user,
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
