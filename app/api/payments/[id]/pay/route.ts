import { apiHandler, NotFoundError, ForbiddenError, BadRequestError } from "@/lib/api";
import { payments, wallets } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { eq, and } from "drizzle-orm";
import { NWCClient } from "@getalby/sdk";

/**
 * POST /api/payments/[id]/pay
 *
 * Attempts to pay a pending payment using the sponsor's NWC wallet.
 * If the kid has a wallet with an invoice, pays that invoice.
 * Otherwise creates a direct payment.
 */
export const POST = apiHandler(async (_request, { session, db, params }) => {
  const paymentId = params.id;

  if (session.role !== "sponsor") {
    throw new ForbiddenError("sponsors_only");
  }

  // Look up the payment record
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

  if (payment.status === "paid") {
    console.log(`[NWC Pay] Payment ${paymentId.slice(0, 8)} already paid`);
    return { already_paid: true };
  }

  console.log(`[NWC Pay] Attempting payment ${paymentId.slice(0, 8)} (${payment.amount_sats} sats, sponsor: ${session.user_id.slice(0, 8)})`);

  // Get sponsor's wallet
  const sponsorWalletRows = await db
    .select({ nwc_url_encrypted: wallets.nwc_url_encrypted })
    .from(wallets)
    .where(and(eq(wallets.user_id, session.user_id), eq(wallets.active, true)))
    .limit(1);

  if (!sponsorWalletRows[0]) {
    console.log(`[NWC Pay] Sponsor has no wallet`);
    throw new BadRequestError("sponsor_no_wallet");
  }

  // If payment has an invoice, pay it
  if (!payment.payment_request) {
    console.log(`[NWC Pay] Payment has no invoice`);
    throw new BadRequestError("no_invoice");
  }

  console.log(`[NWC Pay] Connecting to sponsor's NWC wallet...`);
  const nwcUrl = decrypt(sponsorWalletRows[0].nwc_url_encrypted);
  const client = new NWCClient({ nostrWalletConnectUrl: nwcUrl });

  try {
    const result = await client.payInvoice({
      invoice: payment.payment_request,
    });

    console.log(`[NWC Pay] Payment successful, preimage: ${result.preimage?.slice(0, 8)}...`);

    // Update payment to paid
    await db
      .update(payments)
      .set({
        status: "paid",
        paid_at: new Date(),
        preimage: result.preimage,
        payment_method: "nwc",
      })
      .where(eq(payments.id, paymentId));

    return { paid: true, preimage: result.preimage };
  } catch (error) {
    console.error("[NWC Pay] payInvoice error:", error);

    // Mark as failed
    await db
      .update(payments)
      .set({ status: "failed" })
      .where(eq(payments.id, paymentId));

    const msg = error instanceof Error ? error.message.toLowerCase() : "";
    if (msg.includes("insufficient") || msg.includes("not enough")) {
      throw new BadRequestError("insufficient_funds");
    }
    if (msg.includes("timeout")) {
      throw new BadRequestError("nwc_timeout");
    }
    throw new BadRequestError("nwc_payment_failed");
  } finally {
    client.close();
  }
});
