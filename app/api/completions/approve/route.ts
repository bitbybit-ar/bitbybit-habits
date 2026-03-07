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
    const { completion_id } = body as { completion_id: string };

    if (!completion_id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "El campo completion_id es obligatorio" },
        { status: 400 }
      );
    }

    // Get the completion and verify sponsor is in the same family
    const completions = await db`
      SELECT c.*, h.sat_reward, h.family_id, h.assigned_to, h.name AS habit_name
      FROM completions c
      INNER JOIN habits h ON h.id = c.habit_id
      INNER JOIN family_members fm ON fm.family_id = h.family_id AND fm.user_id = ${session.user_id}
      WHERE c.id = ${completion_id}
        AND c.status = 'pending'
        AND fm.role = 'sponsor'
    ` as (Completion & { sat_reward: number; family_id: string; assigned_to: string; habit_name: string })[];

    if (completions.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Completacion no encontrada o ya procesada" },
        { status: 404 }
      );
    }

    const completion = completions[0];

    // Update completion status
    const updated = await db`
      UPDATE completions
      SET status = 'approved', reviewed_by = ${session.user_id}, reviewed_at = NOW()
      WHERE id = ${completion_id}
      RETURNING *
    ` as Completion[];

    // If habit has sat_reward > 0, create a pending payment record
    if (completion.sat_reward > 0) {
      await db`
        INSERT INTO payments (completion_id, from_user_id, to_user_id, amount_sats, status)
        VALUES (${completion_id}, ${session.user_id}, ${completion.user_id}, ${completion.sat_reward}, 'pending')
      `;
    }

    // Notify the kid
    try {
      const habitName = completion.habit_name ?? "a habit";
      const reward = completion.sat_reward;
      await createNotification(
        completion.user_id,
        "completion_approved",
        "Habit approved! 🎉",
        `Your habit "${habitName}" was approved!${reward > 0 ? ` +${reward} sats` : ""}`,
        { completion_id, habit_name: habitName, reward_sats: reward }
      );
    } catch (notifError) {
      console.error("Error creating notification:", notifError);
    }

    return NextResponse.json<ApiResponse<Completion>>({
      success: true,
      data: updated[0],
    });
  } catch (error) {
    console.error("Error al aprobar completacion:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al aprobar la completacion" },
      { status: 500 }
    );
  }
}
