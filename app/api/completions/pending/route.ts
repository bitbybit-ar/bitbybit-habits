import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { ApiResponse } from "@/lib/types";

interface PendingCompletionRow {
  id: string;
  habit_id: string;
  habit_name: string;
  habit_color: string;
  kid_name: string;
  sat_reward: number;
  date: string;
  completed_at: string;
}

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "No autenticado" },
      { status: 401 }
    );
  }

  if (session.role !== "sponsor") {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Solo los sponsors pueden ver completaciones pendientes" },
      { status: 403 }
    );
  }

  const db = getDb();

  try {
    const pendingCompletions = await db`
      SELECT
        c.id,
        c.habit_id,
        h.name AS habit_name,
        h.color AS habit_color,
        u.display_name AS kid_name,
        h.sat_reward,
        c.date,
        c.completed_at
      FROM completions c
      INNER JOIN habits h ON h.id = c.habit_id
      INNER JOIN users u ON u.id = c.user_id
      INNER JOIN family_members fm ON fm.family_id = h.family_id AND fm.user_id = ${session.user_id}
      WHERE c.status = 'pending'
        AND fm.role = 'sponsor'
      ORDER BY c.completed_at DESC
    ` as PendingCompletionRow[];

    return NextResponse.json<ApiResponse<PendingCompletionRow[]>>({
      success: true,
      data: pendingCompletions,
    });
  } catch (error) {
    console.error("Error al obtener completaciones pendientes:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al obtener las completaciones pendientes" },
      { status: 500 }
    );
  }
}
