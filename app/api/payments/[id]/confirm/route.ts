import { createHash } from "crypto";
import { apiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api";
import { payments } from "@/lib/db";
import { eq } from "drizzle-orm";

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
    console.log(`[Confirm] Payment ${paymentId.slice(0, 8)} already paid`);
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

  await db
    .update(payments)
    .set({
      status: "paid",
      paid_at: new Date(),
      preimage,
      payment_method: "webln",
    })
    .where(eq(payments.id, paymentId));

  console.log(`[Confirm] Payment ${paymentId.slice(0, 8)} confirmed via WebLN`);
  return { confirmed: true };
});
