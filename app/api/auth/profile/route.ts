import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { ApiResponse, User } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "No autenticado" },
      { status: 401 }
    );
  }

  const db = getDb();

  try {
    const users = await db`
      SELECT id, email, username, display_name, avatar_url, locale
      FROM users WHERE id = ${session.user_id}
    ` as Partial<User>[];

    if (users.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: users[0],
    });
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al obtener el perfil" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "No autenticado" },
      { status: 401 }
    );
  }

  const db = getDb();

  try {
    const body = await request.json();
    const { display_name, avatar_url, locale } = body as {
      display_name?: string;
      avatar_url?: string;
      locale?: "es" | "en";
    };

    if (locale && !["es", "en"].includes(locale)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Locale inválido" },
        { status: 400 }
      );
    }

    const updated = await db`
      UPDATE users SET
        display_name = COALESCE(${display_name?.trim() ?? null}, display_name),
        avatar_url = COALESCE(${avatar_url?.trim() ?? null}, avatar_url),
        locale = COALESCE(${locale ?? null}, locale)
      WHERE id = ${session.user_id}
      RETURNING id, email, username, display_name, avatar_url, locale
    `;

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updated[0],
    });
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al actualizar el perfil" },
      { status: 500 }
    );
  }
}
