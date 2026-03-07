import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { ApiResponse, Habit } from "@/lib/types";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "No autenticado" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const db = getDb();

  try {
    // Verify ownership
    const existing = await db`
      SELECT * FROM habits WHERE id = ${id} AND created_by = ${session.user_id}
    `;

    if (existing.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Hábito no encontrado o no tenés permiso para editarlo" },
        { status: 404 }
      );
    }

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
      active,
    } = body as Partial<Habit>;

    const updated = await db`
      UPDATE habits SET
        name = COALESCE(${name ?? null}, name),
        description = COALESCE(${description ?? null}, description),
        color = COALESCE(${color ?? null}, color),
        sat_reward = COALESCE(${sat_reward ?? null}, sat_reward),
        schedule_type = COALESCE(${schedule_type ?? null}, schedule_type),
        schedule_days = COALESCE(${schedule_days ? JSON.stringify(schedule_days) : null}, schedule_days),
        schedule_times_per_week = COALESCE(${schedule_times_per_week ?? null}, schedule_times_per_week),
        verification_type = COALESCE(${verification_type ?? null}, verification_type),
        active = COALESCE(${active ?? null}, active)
      WHERE id = ${id}
      RETURNING *
    ` as Habit[];

    return NextResponse.json<ApiResponse<Habit>>({
      success: true,
      data: updated[0],
    });
  } catch (error) {
    console.error("Error al editar hábito:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al editar el hábito" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "No autenticado" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const db = getDb();

  try {
    const existing = await db`
      SELECT * FROM habits WHERE id = ${id} AND created_by = ${session.user_id}
    `;

    if (existing.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Hábito no encontrado o no tenés permiso para eliminarlo" },
        { status: 404 }
      );
    }

    await db`
      UPDATE habits SET active = false WHERE id = ${id}
    `;

    return NextResponse.json<ApiResponse>({
      success: true,
    });
  } catch (error) {
    console.error("Error al eliminar hábito:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al eliminar el hábito" },
      { status: 500 }
    );
  }
}
