import { createHash } from "crypto";
import { apiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api";
import { payments } from "@/lib/db";
import { eq, and, or } from "drizzle-orm";

/**
 * POST /api/payments/[id]/confirm
 *
 * Confirms a WebLN payment by validating the preimage against the payment hash.
 * Called by the client after a successful webln.sendPayment().
 */
export const POST = apiHandler(async (request, { session, db, params }) => {
  const paymentId = params.id;

  if (session.role !== "sponsor") {
    throw new ForbiddenError("sponsors_only");
  }

  const body = await request.json();
  const { preimage } = body;

  if (!preimage || typeof preimage !== "string") {
    throw new BadRequestError("preimage_required");
  }

  const paymentRows = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!paymentRows[0]) {
    throw new NotFoundError("Payment");
  }

  const payment = paymentRows[0];

  if (payment.from_user_id !== session.user_id) {
    throw new ForbiddenError();
  }

  // Already paid — idempotent
  if (payment.status === "paid") {
    return { confirmed: true, already_paid: true };
  }

  // Validate preimage against payment_hash if available
  if (payment.payment_hash) {
    const hash = createHash("sha256")
      .update(Buffer.from(preimage, "hex"))
      .digest("hex");

    if (hash !== payment.payment_hash) {
      throw new BadRequestError("invalid_preimage");
    }
  }

  // Atomic update: set to "paid" if pending or failed (NWC auto-pay may have
  // marked it failed before WebLN confirmation arrives)
  const updated = await db
    .update(payments)
    .set({
      status: "paid",
      paid_at: new Date(),
      preimage,
      payment_method: "webln",
    })
    .where(and(
      eq(payments.id, paymentId),
      or(eq(payments.status, "pending"), eq(payments.status, "failed"))
    ))
    .returning({ id: payments.id });

  if (updated.length === 0) {
    // Another request already confirmed — treat as idempotent
    return { confirmed: true, already_paid: true };
  }

  return { confirmed: true };
}, { rateLimit: "auth" });
