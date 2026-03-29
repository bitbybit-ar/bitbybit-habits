import { apiHandler, requireFields, NotFoundError, BadRequestError } from "@/lib/api";
import { payments } from "@/lib/db";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/payments/retry
 * Body: { payment_id: string }
 *
 * Resets a failed payment to pending. Clears stale invoice data if expired.
 * Returns the payment record so the client can re-run the full payment cascade
 * (generate invoice → WebLN → NWC → QR).
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
    throw new NotFoundError("Payment");
  }

  if (existing[0].status !== "failed") {
    throw new BadRequestError("only_failed_retry");
  }

  // Reset to pending, clear old invoice data so client generates a fresh one
  await db
    .update(payments)
    .set({
      status: "pending",
      payment_request: null,
      payment_hash: null,
      preimage: null,
      payment_method: null,
      paid_at: null,
    })
    .where(eq(payments.id, payment_id!));

  const updated = await db
    .select()
    .from(payments)
    .where(eq(payments.id, payment_id!));

  return updated[0];
});
