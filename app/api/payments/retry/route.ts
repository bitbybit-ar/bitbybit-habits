import { apiHandler, requireFields, NotFoundError, BadRequestError } from "@/lib/api";
import { payments, wallets } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { eq, and } from "drizzle-orm";
import { NWCClient } from "@getalby/sdk";

/**
 * POST /api/payments/retry
 * Body: { payment_id: string }
 *
 * Re-attempts a failed payment:
 * 1. Resets status to pending
 * 2. Attempts NWC payment with the existing invoice
 * 3. If invoice expired, returns needs_new_invoice so the client can regenerate
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

  const payment = existing[0];

  // Reset status to pending
  await db
    .update(payments)
    .set({ status: "pending", payment_hash: null, paid_at: null })
    .where(eq(payments.id, payment_id!));

  // If no invoice exists, signal client to regenerate
  if (!payment.payment_request) {
    const updated = await db
      .select()
      .from(payments)
      .where(eq(payments.id, payment_id!));
    return { ...updated[0], needs_new_invoice: true };
  }

  // Get sponsor's wallet
  const sponsorWallet = await db
    .select({ nwc_url_encrypted: wallets.nwc_url_encrypted })
    .from(wallets)
    .where(and(eq(wallets.user_id, session.user_id), eq(wallets.active, true)))
    .limit(1);

  if (!sponsorWallet[0]) {
    // No wallet — return pending payment for manual payment later
    const updated = await db
      .select()
      .from(payments)
      .where(eq(payments.id, payment_id!));
    return updated[0];
  }

  // Attempt NWC payment
  const nwcUrl = decrypt(sponsorWallet[0].nwc_url_encrypted);
  const client = new NWCClient({ nostrWalletConnectUrl: nwcUrl });

  try {
    await client.payInvoice({ invoice: payment.payment_request });

    // Payment succeeded
    const updated = await db
      .update(payments)
      .set({ status: "paid", paid_at: new Date() })
      .where(eq(payments.id, payment_id!))
      .returning();

    return { ...updated[0], paid: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "";

    // Invoice likely expired — signal client to regenerate
    if (errorMsg.includes("expired") || errorMsg.includes("INVOICE_EXPIRED")) {
      await db
        .update(payments)
        .set({ status: "failed", payment_request: null })
        .where(eq(payments.id, payment_id!));

      const updated = await db
        .select()
        .from(payments)
        .where(eq(payments.id, payment_id!));
      return { ...updated[0], needs_new_invoice: true };
    }

    // Other error — mark as failed again
    await db
      .update(payments)
      .set({ status: "failed" })
      .where(eq(payments.id, payment_id!));

    throw new BadRequestError(
      `Payment retry failed: ${errorMsg || "Unknown error"}`
    );
  } finally {
    client.close();
  }
});
