import { apiHandler } from "@/lib/api";
import type { PaymentWithDetails } from "@/lib/types";

/**
 * GET /api/payments
 *
 * Query params:
 *   role — "sponsor" | "kid" (filters perspective; omit for both)
 *   from — ISO date string (inclusive lower bound)
 *   to   — ISO date string (inclusive upper bound)
 */
export const GET = apiHandler(async (request, { session, db }) => {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let payments: PaymentWithDetails[];

  if (role === "sponsor") {
    payments = await db`
      SELECT p.*,
        h.name AS habit_name,
        tu.display_name AS other_user_display_name
      FROM payments p
      JOIN completions c ON c.id = p.completion_id
      JOIN habits h ON h.id = c.habit_id
      JOIN users tu ON tu.id = p.to_user_id
      WHERE p.from_user_id = ${session.user_id}
        ${from ? db`AND p.created_at >= ${from}` : db``}
        ${to ? db`AND p.created_at <= ${to}` : db``}
      ORDER BY p.created_at DESC
    ` as PaymentWithDetails[];
  } else if (role === "kid") {
    payments = await db`
      SELECT p.*,
        h.name AS habit_name,
        fu.display_name AS other_user_display_name
      FROM payments p
      JOIN completions c ON c.id = p.completion_id
      JOIN habits h ON h.id = c.habit_id
      JOIN users fu ON fu.id = p.from_user_id
      WHERE p.to_user_id = ${session.user_id}
        ${from ? db`AND p.created_at >= ${from}` : db``}
        ${to ? db`AND p.created_at <= ${to}` : db``}
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
        ${from ? db`AND p.created_at >= ${from}` : db``}
        ${to ? db`AND p.created_at <= ${to}` : db``}
      ORDER BY p.created_at DESC
    ` as PaymentWithDetails[];
  }

  return payments;
});
