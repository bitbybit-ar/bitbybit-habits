import { apiHandler, requireFields, NotFoundError, BadRequestError } from "@/lib/api";
import type { Payment } from "@/lib/types";

/**
 * POST /api/payments/retry
 * Body: { payment_id: string }
 *
 * Re-attempts a failed payment.
 * Currently resets status to 'pending'; NWC execution will be plugged in later.
 */
export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { payment_id } = body as { payment_id?: string };

  requireFields({ payment_id }, ["payment_id"]);

  // Verify ownership and failed status
  const existing = await db`
    SELECT * FROM payments
    WHERE id = ${payment_id} AND from_user_id = ${session.user_id}
  ` as Payment[];

  if (existing.length === 0) {
    throw new NotFoundError("Pago");
  }

  if (existing[0].status !== "failed") {
    throw new BadRequestError("Solo se pueden reintentar pagos fallidos");
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

  return updated[0];
});
