import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import type { ApiResponse, Completion, Habit } from "@/lib/types";

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
    const { habit_id, note, evidence_url } = body as {
      habit_id: string;
      note?: string;
      evidence_url?: string;
    };

    if (!habit_id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "El campo habit_id es obligatorio" },
        { status: 400 }
      );
    }

    // Verify the habit exists and is assigned to this kid
    const habits = await db`
      SELECT * FROM habits
      WHERE id = ${habit_id}
        AND assigned_to = ${session.user_id}
        AND active = true
    ` as Habit[];

    if (habits.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Habito no encontrado o no asignado a vos" },
        { status: 404 }
      );
    }

    const habit = habits[0];
    const today = new Date().toISOString().split("T")[0];

    // Check if already completed today
    const existing = await db`
      SELECT id FROM completions
      WHERE habit_id = ${habit_id}
        AND user_id = ${session.user_id}
        AND date = ${today}
    `;

    if (existing.length > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Ya completaste este habito hoy" },
        { status: 409 }
      );
    }

    // Status depends on verification type
    const status = habit.verification_type === "self_verify" ? "approved" : "pending";

    const completions = await db`
      INSERT INTO completions (habit_id, user_id, date, status, note, evidence_url)
      VALUES (${habit_id}, ${session.user_id}, ${today}, ${status}, ${note ?? null}, ${evidence_url ?? null})
      RETURNING *
    ` as Completion[];

    // Notify sponsor(s) in the family if pending approval
    if (status === "pending" && habit.family_id) {
      try {
        const sponsors = await db`
          SELECT fm.user_id FROM family_members fm
          WHERE fm.family_id = ${habit.family_id} AND fm.role = 'sponsor'
        `;
        const displayName = session.display_name || session.username;
        for (const sponsor of sponsors) {
          await createNotification(
            sponsor.user_id,
            "completion_pending",
            "Habit completed!",
            `${displayName} completed "${habit.name}" and is waiting for approval.`,
            { completion_id: completions[0].id, habit_id: habit.id, kid_name: displayName }
          );
        }
      } catch (notifError) {
        console.error("Error creating notification:", notifError);
      }
    }

    return NextResponse.json<ApiResponse<Completion>>({
      success: true,
      data: completions[0],
    }, { status: 201 });
  } catch (error) {
    console.error("Error al crear completion:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al registrar la completacion" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "No autenticado" },
      { status: 401 }
    );
  }

  const db = getDb();
  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("from");
  const dateTo = searchParams.get("to");

  try {
    let completions: Completion[];

    if (dateFrom && dateTo) {
      completions = await db`
        SELECT c.* FROM completions c
        INNER JOIN habits h ON h.id = c.habit_id
        LEFT JOIN family_members fm ON fm.family_id = h.family_id AND fm.user_id = ${session.user_id}
        WHERE c.user_id = ${session.user_id}
          AND (h.family_id IS NULL OR fm.id IS NOT NULL)
          AND c.date >= ${dateFrom}
          AND c.date <= ${dateTo}
        ORDER BY c.date DESC, c.completed_at DESC
      ` as Completion[];
    } else if (dateFrom) {
      completions = await db`
        SELECT c.* FROM completions c
        INNER JOIN habits h ON h.id = c.habit_id
        LEFT JOIN family_members fm ON fm.family_id = h.family_id AND fm.user_id = ${session.user_id}
        WHERE c.user_id = ${session.user_id}
          AND (h.family_id IS NULL OR fm.id IS NOT NULL)
          AND c.date >= ${dateFrom}
        ORDER BY c.date DESC, c.completed_at DESC
      ` as Completion[];
    } else if (dateTo) {
      completions = await db`
        SELECT c.* FROM completions c
        INNER JOIN habits h ON h.id = c.habit_id
        LEFT JOIN family_members fm ON fm.family_id = h.family_id AND fm.user_id = ${session.user_id}
        WHERE c.user_id = ${session.user_id}
          AND (h.family_id IS NULL OR fm.id IS NOT NULL)
          AND c.date <= ${dateTo}
        ORDER BY c.date DESC, c.completed_at DESC
      ` as Completion[];
    } else {
      completions = await db`
        SELECT c.* FROM completions c
        INNER JOIN habits h ON h.id = c.habit_id
        LEFT JOIN family_members fm ON fm.family_id = h.family_id AND fm.user_id = ${session.user_id}
        WHERE c.user_id = ${session.user_id}
          AND (h.family_id IS NULL OR fm.id IS NOT NULL)
        ORDER BY c.date DESC, c.completed_at DESC
      ` as Completion[];
    }

    return NextResponse.json<ApiResponse<Completion[]>>({
      success: true,
      data: completions,
    });
  } catch (error) {
    console.error("Error al obtener completions:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al obtener las completaciones" },
      { status: 500 }
    );
  }
}
