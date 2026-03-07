import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import type { ApiResponse, Completion } from "@/lib/types";

export async function POST(request: NextRequest) {
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
    const { completion_id, reason } = body as {
      completion_id: string;
      reason?: string;
    };

    if (!completion_id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "El campo completion_id es obligatorio" },
        { status: 400 }
      );
    }

    // Verify sponsor is in the same family as the habit
    const completions = await db`
      SELECT c.*, h.name AS habit_name FROM completions c
      INNER JOIN habits h ON h.id = c.habit_id
      INNER JOIN family_members fm ON fm.family_id = h.family_id AND fm.user_id = ${session.user_id}
      WHERE c.id = ${completion_id}
        AND c.status = 'pending'
        AND fm.role = 'sponsor'
    ` as (Completion & { habit_name: string })[];

    if (completions.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Completacion no encontrada o ya procesada" },
        { status: 404 }
      );
    }

    const updated = await db`
      UPDATE completions
      SET status = 'rejected', reviewed_by = ${session.user_id}, reviewed_at = NOW(), note = COALESCE(${reason ?? null}, note)
      WHERE id = ${completion_id}
      RETURNING *
    ` as Completion[];

    // Notify the kid
    const completion = completions[0];
    try {
      await createNotification(
        completion.user_id,
        "completion_rejected",
        "Habit not approved",
        `Your habit "${completion.habit_name}" was not approved.`,
        { completion_id, habit_name: completion.habit_name }
      );
    } catch (notifError) {
      console.error("Error creating notification:", notifError);
    }

    return NextResponse.json<ApiResponse<Completion>>({
      success: true,
      data: updated[0],
    });
  } catch (error) {
    console.error("Error al rechazar completacion:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al rechazar la completacion" },
      { status: 500 }
    );
  }
}
