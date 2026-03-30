import { apiHandler, BadRequestError, ForbiddenError } from "@/lib/api";
import { completions, habits, payments, wallets, familyMembers } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { eq, and } from "drizzle-orm";
import { NWCClient, Nip47WalletError, Nip47TimeoutError, Nip47NetworkError } from "@getalby/sdk";
import { extractPaymentHash } from "@/lib/lightning";

/**
 * POST /api/payments/invoice
 *
 * Generates a Lightning invoice from the kid's NWC wallet and updates the
 * existing payment record with the invoice data. Requires a payment_id
 * (created by the approve endpoint) or falls back to completion_id lookup.
 */
export const POST = apiHandler(async (request, { session, db }) => {
  if (session.role !== "sponsor") {
    throw new ForbiddenError("sponsors_only");
  }

  const body = await request.json();
  const { payment_id, completion_id, amount_sats } = body as {
    payment_id?: string;
    completion_id: string;
    amount_sats: number;
  };

  if (!completion_id || !amount_sats || amount_sats <= 0) {
    throw new BadRequestError("missing_fields");
  }

  // Look up the completion and verify sponsor is in the same family
  const completionRows = await db
    .select({
      id: completions.id,
      user_id: completions.user_id,
      habit_id: completions.habit_id,
      habit_name: habits.name,
    })
    .from(completions)
    .innerJoin(habits, eq(habits.id, completions.habit_id))
    .innerJoin(
      familyMembers,
      and(
        eq(familyMembers.family_id, habits.family_id),
        eq(familyMembers.user_id, session.user_id)
      )
    )
    .where(
      and(eq(completions.id, completion_id), eq(familyMembers.role, "sponsor"))
    )
    .limit(1);

  if (!completionRows[0]) {
    throw new BadRequestError("completion_not_found");
  }

  const completion = completionRows[0];
  const kidUserId = completion.user_id;
  const habitName = completion.habit_name ?? "Habit";

  // Look up kid's active wallet
  const walletRows = await db
    .select({ nwc_url_encrypted: wallets.nwc_url_encrypted })
    .from(wallets)
    .where(and(eq(wallets.user_id, kidUserId), eq(wallets.active, true)))
    .limit(1);

  if (!walletRows[0]) {
    throw new BadRequestError("kid_no_wallet");
  }

  const nwcUrl = decrypt(walletRows[0].nwc_url_encrypted);
  const client = new NWCClient({ nostrWalletConnectUrl: nwcUrl });

  try {
    const transaction = await client.makeInvoice({
      amount: amount_sats * 1000, // millisats
      description: `BitByBit: ${habitName}`,
    });

    // Some wallets (e.g. Primal) return empty payment_hash — extract from BOLT11
    const payment_hash = transaction.payment_hash || extractPaymentHash(transaction.invoice) || "";

    // If we have a payment_id from approve, update that record.
    // Otherwise create a new one (backward compatibility for retry).
    let finalPaymentId = payment_id;

    if (payment_id) {
      await db
        .update(payments)
        .set({
          payment_request: transaction.invoice,
          payment_hash,
        })
        .where(eq(payments.id, payment_id));
    } else {
      const paymentRows = await db
        .insert(payments)
        .values({
          completion_id,
          from_user_id: session.user_id,
          to_user_id: kidUserId,
          amount_sats,
          payment_request: transaction.invoice,
          payment_hash,
          status: "pending",
        })
        .returning();
      finalPaymentId = paymentRows[0].id;
    }

    return {
      paymentRequest: transaction.invoice,
      paymentHash: payment_hash,
      payment_id: finalPaymentId,
      completion_id,
    };
  } catch (error) {
    if (error instanceof Nip47WalletError) {
      if (error.code === "NOT_IMPLEMENTED") {
        throw new BadRequestError("make_invoice_not_supported");
      }
      throw new BadRequestError(`wallet_error: ${error.code}`);
    }
    if (error instanceof Nip47TimeoutError) {
      throw new BadRequestError("nwc_timeout");
    }
    if (error instanceof Nip47NetworkError) {
      throw new BadRequestError("nwc_relay_error");
    }
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("no info event") || msg.includes("13194")) {
      throw new BadRequestError("nwc_no_info_event");
    }
    throw new BadRequestError(
      msg === "timeout" ? "nwc_timeout" : "nwc_invoice_failed"
    );
  } finally {
    client.close();
  }
}, { rateLimit: "auth" });
