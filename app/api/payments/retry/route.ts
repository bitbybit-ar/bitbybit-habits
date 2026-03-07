import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { ApiResponse, Payment } from "@/lib/types";

/**
 * POST /api/payments/retry
 * Body: { payment_id: string }
 *
 * Re-attempts a failed payment.
 * Currently resets status to 'pending'; NWC execution will be plugged in later.
 */
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
    const { payment_id } = body as { payment_id?: string };

    if (!payment_id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "El campo payment_id es obligatorio" },
        { status: 400 }
      );
    }

    // Verify ownership and failed status
    const existing = await db`
      SELECT * FROM payments
      WHERE id = ${payment_id} AND from_user_id = ${session.user_id}
    ` as Payment[];

    if (existing.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Pago no encontrado" },
        { status: 404 }
      );
    }

    if (existing[0].status !== "failed") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Solo se pueden reintentar pagos fallidos" },
        { status: 400 }
      );
    }

    // ── NWC placeholder ──────────────────────────────────────────
    // TODO: Execute NWC payment here. On success set status='paid',
    // on failure set status='failed' with error details.
    // For now we just reset to 'pending'.
    // ─────────────────────────────────────────────────────────────

    const updated = await db`
      UPDATE payments
      SET status = 'pending', payment_hash = NULL, paid_at = NULL
      WHERE id = ${payment_id}
      RETURNING *
    ` as Payment[];

    return NextResponse.json<ApiResponse<Payment>>({
      success: true,
      data: updated[0],
    });
  } catch (error) {
    console.error("Error al reintentar pago:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al reintentar el pago" },
      { status: 500 }
    );
  }
}
