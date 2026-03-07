import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { ApiResponse, Notification } from "@/lib/types";

/**
 * GET /api/notifications
 * Query params:
 *   unread — "true" to return only unread notifications
 */
export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "No autenticado" },
      { status: 401 }
    );
  }

  const db = getDb();
  const unreadOnly = new URL(request.url).searchParams.get("unread") === "true";

  try {
    let notifications: Notification[];

    if (unreadOnly) {
      notifications = await db`
        SELECT * FROM notifications
        WHERE user_id = ${session.user_id} AND read = false
        ORDER BY created_at DESC
        LIMIT 50
      ` as Notification[];
    } else {
      notifications = await db`
        SELECT * FROM notifications
        WHERE user_id = ${session.user_id}
        ORDER BY created_at DESC
        LIMIT 50
      ` as Notification[];
    }

    return NextResponse.json<ApiResponse<Notification[]>>({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("Error al obtener notificaciones:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al obtener las notificaciones" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Body: { id: string }
 * Marks a notification as read.
 */
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
    const { id } = body as { id?: string };

    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "El campo id es obligatorio" },
        { status: 400 }
      );
    }

    await db`
      UPDATE notifications SET read = true
      WHERE id = ${id} AND user_id = ${session.user_id}
    `;

    return NextResponse.json<ApiResponse>({ success: true });
  } catch (error) {
    console.error("Error al marcar notificacion:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al actualizar la notificacion" },
      { status: 500 }
    );
  }
}
