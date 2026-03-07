import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { ApiResponse, PaymentWithDetails } from "@/lib/types";

/**
 * GET /api/payments
 *
 * Query params:
 *   role — "sponsor" | "kid" (filters perspective; omit for both)
 *   from — ISO date string (inclusive lower bound)
 *   to   — ISO date string (inclusive upper bound)
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
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  try {
    // Build the query based on role filter
    let payments: PaymentWithDetails[];

    if (role === "sponsor") {
      payments = await db`
        SELECT
          p.*,
          h.name AS habit_name,
          tu.display_name AS other_user_display_name
        FROM payments p
        JOIN habits h ON h.id = p.completion_id AND false
        JOIN users tu ON tu.id = p.to_user_id
        WHERE false
      ` as PaymentWithDetails[];

      // Use proper query with dynamic conditions
      if (from && to) {
        payments = await db`
          SELECT p.*,
            h.name AS habit_name,
            tu.display_name AS other_user_display_name
          FROM payments p
          JOIN completions c ON c.id = p.completion_id
          JOIN habits h ON h.id = c.habit_id
          JOIN users tu ON tu.id = p.to_user_id
          WHERE p.from_user_id = ${session.user_id}
            AND p.created_at >= ${from}
            AND p.created_at <= ${to}
          ORDER BY p.created_at DESC
        ` as PaymentWithDetails[];
      } else if (from) {
        payments = await db`
          SELECT p.*,
            h.name AS habit_name,
            tu.display_name AS other_user_display_name
          FROM payments p
          JOIN completions c ON c.id = p.completion_id
          JOIN habits h ON h.id = c.habit_id
          JOIN users tu ON tu.id = p.to_user_id
          WHERE p.from_user_id = ${session.user_id}
            AND p.created_at >= ${from}
          ORDER BY p.created_at DESC
        ` as PaymentWithDetails[];
      } else if (to) {
        payments = await db`
          SELECT p.*,
            h.name AS habit_name,
            tu.display_name AS other_user_display_name
          FROM payments p
          JOIN completions c ON c.id = p.completion_id
          JOIN habits h ON h.id = c.habit_id
          JOIN users tu ON tu.id = p.to_user_id
          WHERE p.from_user_id = ${session.user_id}
            AND p.created_at <= ${to}
          ORDER BY p.created_at DESC
        ` as PaymentWithDetails[];
      } else {
        payments = await db`
          SELECT p.*,
            h.name AS habit_name,
            tu.display_name AS other_user_display_name
          FROM payments p
          JOIN completions c ON c.id = p.completion_id
          JOIN habits h ON h.id = c.habit_id
          JOIN users tu ON tu.id = p.to_user_id
          WHERE p.from_user_id = ${session.user_id}
          ORDER BY p.created_at DESC
        ` as PaymentWithDetails[];
      }
    } else if (role === "kid") {
      if (from && to) {
        payments = await db`
          SELECT p.*,
            h.name AS habit_name,
            fu.display_name AS other_user_display_name
          FROM payments p
          JOIN completions c ON c.id = p.completion_id
          JOIN habits h ON h.id = c.habit_id
          JOIN users fu ON fu.id = p.from_user_id
          WHERE p.to_user_id = ${session.user_id}
            AND p.created_at >= ${from}
            AND p.created_at <= ${to}
          ORDER BY p.created_at DESC
        ` as PaymentWithDetails[];
      } else if (from) {
        payments = await db`
          SELECT p.*,
            h.name AS habit_name,
            fu.display_name AS other_user_display_name
          FROM payments p
          JOIN completions c ON c.id = p.completion_id
          JOIN habits h ON h.id = c.habit_id
          JOIN users fu ON fu.id = p.from_user_id
          WHERE p.to_user_id = ${session.user_id}
            AND p.created_at >= ${from}
          ORDER BY p.created_at DESC
        ` as PaymentWithDetails[];
      } else if (to) {
        payments = await db`
          SELECT p.*,
            h.name AS habit_name,
            fu.display_name AS other_user_display_name
          FROM payments p
          JOIN completions c ON c.id = p.completion_id
          JOIN habits h ON h.id = c.habit_id
          JOIN users fu ON fu.id = p.from_user_id
          WHERE p.to_user_id = ${session.user_id}
            AND p.created_at <= ${to}
          ORDER BY p.created_at DESC
        ` as PaymentWithDetails[];
      } else {
        payments = await db`
          SELECT p.*,
            h.name AS habit_name,
            fu.display_name AS other_user_display_name
          FROM payments p
          JOIN completions c ON c.id = p.completion_id
          JOIN habits h ON h.id = c.habit_id
          JOIN users fu ON fu.id = p.from_user_id
          WHERE p.to_user_id = ${session.user_id}
          ORDER BY p.created_at DESC
        ` as PaymentWithDetails[];
      }
    } else {
      // Both perspectives
      if (from && to) {
        payments = await db`
          SELECT p.*,
            h.name AS habit_name,
            CASE WHEN p.from_user_id = ${session.user_id} THEN tu.display_name ELSE fu.display_name END AS other_user_display_name
          FROM payments p
          JOIN completions c ON c.id = p.completion_id
          JOIN habits h ON h.id = c.habit_id
          JOIN users fu ON fu.id = p.from_user_id
          JOIN users tu ON tu.id = p.to_user_id
          WHERE (p.from_user_id = ${session.user_id} OR p.to_user_id = ${session.user_id})
            AND p.created_at >= ${from}
            AND p.created_at <= ${to}
          ORDER BY p.created_at DESC
        ` as PaymentWithDetails[];
      } else if (from) {
        payments = await db`
          SELECT p.*,
            h.name AS habit_name,
            CASE WHEN p.from_user_id = ${session.user_id} THEN tu.display_name ELSE fu.display_name END AS other_user_display_name
          FROM payments p
          JOIN completions c ON c.id = p.completion_id
          JOIN habits h ON h.id = c.habit_id
          JOIN users fu ON fu.id = p.from_user_id
          JOIN users tu ON tu.id = p.to_user_id
          WHERE (p.from_user_id = ${session.user_id} OR p.to_user_id = ${session.user_id})
            AND p.created_at >= ${from}
          ORDER BY p.created_at DESC
        ` as PaymentWithDetails[];
      } else if (to) {
        payments = await db`
          SELECT p.*,
            h.name AS habit_name,
            CASE WHEN p.from_user_id = ${session.user_id} THEN tu.display_name ELSE fu.display_name END AS other_user_display_name
          FROM payments p
          JOIN completions c ON c.id = p.completion_id
          JOIN habits h ON h.id = c.habit_id
          JOIN users fu ON fu.id = p.from_user_id
          JOIN users tu ON tu.id = p.to_user_id
          WHERE (p.from_user_id = ${session.user_id} OR p.to_user_id = ${session.user_id})
            AND p.created_at <= ${to}
          ORDER BY p.created_at DESC
        ` as PaymentWithDetails[];
      } else {
        payments = await db`
          SELECT p.*,
            h.name AS habit_name,
            CASE WHEN p.from_user_id = ${session.user_id} THEN tu.display_name ELSE fu.display_name END AS other_user_display_name
          FROM payments p
          JOIN completions c ON c.id = p.completion_id
          JOIN habits h ON h.id = c.habit_id
          JOIN users fu ON fu.id = p.from_user_id
          JOIN users tu ON tu.id = p.to_user_id
          WHERE (p.from_user_id = ${session.user_id} OR p.to_user_id = ${session.user_id})
          ORDER BY p.created_at DESC
        ` as PaymentWithDetails[];
      }
    }

    return NextResponse.json<ApiResponse<PaymentWithDetails[]>>({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("Error al obtener pagos:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al obtener los pagos" },
      { status: 500 }
    );
  }
}
