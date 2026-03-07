import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { ApiResponse, Habit } from "@/lib/types";

interface HabitWithCompletion extends Habit {
  completed_today: boolean;
}

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "No autenticado" },
      { status: 401 }
    );
  }

  const db = getDb();
  const today = new Date().toISOString().split("T")[0];

  try {
    let habits: HabitWithCompletion[];

    if (session.role === "kid") {
      // Kid: habits assigned to them, within their families
      habits = await db`
        SELECT h.*,
          CASE WHEN c.id IS NOT NULL THEN true ELSE false END AS completed_today
        FROM habits h
        INNER JOIN family_members fm ON fm.family_id = h.family_id AND fm.user_id = ${session.user_id}
        LEFT JOIN completions c ON c.habit_id = h.id AND c.user_id = ${session.user_id} AND c.date = ${today}
        WHERE h.assigned_to = ${session.user_id}
          AND h.active = true
        ORDER BY h.created_at DESC
      ` as HabitWithCompletion[];
    } else {
      // Sponsor: habits created by them, within their families
      habits = await db`
        SELECT h.*,
          CASE WHEN c.id IS NOT NULL THEN true ELSE false END AS completed_today
        FROM habits h
        INNER JOIN family_members fm ON fm.family_id = h.family_id AND fm.user_id = ${session.user_id}
        LEFT JOIN completions c ON c.habit_id = h.id AND c.user_id = h.assigned_to AND c.date = ${today}
        WHERE h.created_by = ${session.user_id}
          AND h.active = true
        ORDER BY h.created_at DESC
      ` as HabitWithCompletion[];
    }

    return NextResponse.json<ApiResponse<HabitWithCompletion[]>>({
      success: true,
      data: habits,
    });
  } catch (error) {
    console.error("Error al obtener habitos:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al obtener los habitos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "No autenticado" },
      { status: 401 }
    );
  }

  if (session.role !== "sponsor") {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Solo los sponsors pueden crear habitos" },
      { status: 403 }
    );
  }

  const db = getDb();

  try {
    const body = await request.json();
    const {
      name,
      description,
      color,
      sat_reward,
      schedule_type,
      schedule_days,
      schedule_times_per_week,
      verification_type,
      assigned_to,
      family_id,
    } = body as {
      name: string;
      description?: string;
      color: string;
      sat_reward: number;
      schedule_type: "daily" | "specific_days" | "times_per_week";
      schedule_days?: number[];
      schedule_times_per_week?: number;
      verification_type: "sponsor_approval" | "self_verify";
      assigned_to: string;
      family_id: string;
    };

    if (!name || !color || sat_reward == null || !schedule_type || !verification_type || !assigned_to || !family_id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    // Validate sponsor owns the family
    const sponsorMembership = await db`
      SELECT id FROM family_members
      WHERE family_id = ${family_id}
        AND user_id = ${session.user_id}
        AND role = 'sponsor'
    `;

    if (sponsorMembership.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No sos sponsor de esta familia" },
        { status: 403 }
      );
    }

    // Validate assigned_to is a kid member of the family
    const kidMembership = await db`
      SELECT id FROM family_members
      WHERE family_id = ${family_id}
        AND user_id = ${assigned_to}
        AND role = 'kid'
    `;

    if (kidMembership.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "El usuario asignado no es un kid de esta familia" },
        { status: 400 }
      );
    }

    const scheduleDaysJson = schedule_days ? JSON.stringify(schedule_days) : null;

    const habits = await db`
      INSERT INTO habits (family_id, created_by, assigned_to, name, description, color, sat_reward, schedule_type, schedule_days, schedule_times_per_week, verification_type)
      VALUES (${family_id}, ${session.user_id}, ${assigned_to}, ${name.trim()}, ${description?.trim() ?? null}, ${color}, ${sat_reward}, ${schedule_type}, ${scheduleDaysJson}, ${schedule_times_per_week ?? null}, ${verification_type})
      RETURNING *
    ` as Habit[];

    return NextResponse.json<ApiResponse<Habit>>({
      success: true,
      data: habits[0],
    }, { status: 201 });
  } catch (error) {
    console.error("Error al crear habito:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al crear el habito" },
      { status: 500 }
    );
  }
}
