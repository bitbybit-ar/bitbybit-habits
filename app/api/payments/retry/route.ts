import { apiHandler, requireFields, NotFoundError, BadRequestError } from "@/lib/api";
import { payments } from "@/lib/db";
import { eq, and } from "drizzle-orm";

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
  const existing = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, payment_id!), eq(payments.from_user_id, session.user_id)));

  if (existing.length === 0) {
    throw new NotFoundError("Pago");
  }

  if (existing[0].status !== "failed") {
    throw new BadRequestError("Solo se pueden reintentar pagos fallidos");
  }

  const updated = await db
    .update(payments)
    .set({ status: "pending", payment_hash: null, paid_at: null })
    .where(eq(payments.id, payment_id!))
    .returning();

  return updated[0];
});
