import { apiHandler, NotFoundError, ForbiddenError } from "@/lib/api";
import { payments, wallets } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { eq, and } from "drizzle-orm";
import { NWCClient, Nip47WalletError } from "@getalby/sdk";

/**
 * GET /api/payments/[id]/status
 *
 * Checks the payment status of a Lightning invoice via the kid's NWC wallet.
 * Updates the payment record to "paid" if the invoice has been settled.
 */
export const GET = apiHandler(async (_request, { session, db, params }) => {
  const paymentId = params.id;

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

  // Only the payer (sponsor) or payee (kid) can check this payment's status
  if (payment.from_user_id !== session.user_id && payment.to_user_id !== session.user_id) {
    throw new ForbiddenError();
  }

  // Already paid — no need to check NWC
  if (payment.status === "paid") {
    return { settled: true };
  }

  if (!payment.payment_hash) {
    return { settled: false };
  }

  // Get kid's wallet to check invoice status
  const walletRows = await db
    .select({ nwc_url_encrypted: wallets.nwc_url_encrypted })
    .from(wallets)
    .where(and(eq(wallets.user_id, payment.to_user_id), eq(wallets.active, true)))
    .limit(1);

  if (!walletRows[0]) {
    return { settled: false };
  }

  const nwcUrl = decrypt(walletRows[0].nwc_url_encrypted);
  const client = new NWCClient({ nostrWalletConnectUrl: nwcUrl });

  try {
    // 5 second timeout on the NWC call
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("NWC lookup timeout")), 5000)
    );

    let settled = false;

    try {
      const result = await Promise.race([
        client.lookupInvoice({ payment_hash: payment.payment_hash }),
        timeoutPromise,
      ]);
      settled = !!result.settled_at;
    } catch (lookupErr) {
      // Fallback: some wallets (e.g. Primal) don't support lookupInvoice —
      // search recent transactions by payment_hash instead.
      if (lookupErr instanceof Nip47WalletError && lookupErr.code === "NOT_FOUND") {
        try {
          const txResult = await Promise.race([
            client.listTransactions({ limit: 20 }),
            timeoutPromise,
          ]);
          const txs = txResult.transactions ?? [];
          const match = txs.find(
            (tx: { payment_hash?: string; state?: string }) =>
              tx.payment_hash === payment.payment_hash && tx.state === "settled"
          );
          settled = !!match;
        } catch {
          // listTransactions also failed — give up gracefully
        }
      }
    }

    if (settled) {
      // Atomic update: only set to "paid" if still pending (prevents duplicate updates)
      await db
        .update(payments)
        .set({ status: "paid", paid_at: new Date(), payment_method: "manual" })
        .where(and(eq(payments.id, paymentId), eq(payments.status, "pending")));

      return { settled: true };
    }

    return { settled: false };
  } catch {
    // Timeout or NWC error — return false, don't crash
    return { settled: false };
  } finally {
    client.close();
  }
});
