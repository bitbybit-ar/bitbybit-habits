import { NextResponse } from "next/server";
import { apiHandler, BadRequestError, ForbiddenError } from "@/lib/api";
import { completions, habits, payments, wallets } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { eq, and } from "drizzle-orm";
import { NWCClient } from "@getalby/sdk";
import type { ApiResponse } from "@/lib/types";

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

  // Look up the completion to find the kid
  const completionRows = await db
    .select({
      id: completions.id,
      user_id: completions.user_id,
      habit_id: completions.habit_id,
    })
    .from(completions)
    .where(eq(completions.id, completion_id))
    .limit(1);

  if (!completionRows[0]) {
    throw new BadRequestError("completion_not_found");
  }

  const completion = completionRows[0];
  const kidUserId = completion.user_id;

  // Get habit name for the invoice description
  const habitRows = await db
    .select({ name: habits.name })
    .from(habits)
    .where(eq(habits.id, completion.habit_id))
    .limit(1);

  const habitName = habitRows[0]?.name ?? "Habit";

  // Look up kid's active wallet
  const walletRows = await db
    .select({ nwc_url_encrypted: wallets.nwc_url_encrypted })
    .from(wallets)
    .where(and(eq(wallets.user_id, kidUserId), eq(wallets.active, true)))
    .limit(1);

  if (!walletRows[0]) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "kid_no_wallet" },
      { status: 422 }
    );
  }

  const nwcUrl = decrypt(walletRows[0].nwc_url_encrypted);
  const client = new NWCClient({ nostrWalletConnectUrl: nwcUrl });

  try {
    const transaction = await client.makeInvoice({
      amount: amount_sats * 1000, // millisats
      description: `BitByBit: ${habitName}`,
    });

    // If we have a payment_id from approve, update that record.
    // Otherwise create a new one (backward compatibility for retry).
    let finalPaymentId = payment_id;

    if (payment_id) {
      await db
        .update(payments)
        .set({
          payment_request: transaction.invoice,
          payment_hash: transaction.payment_hash,
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
          payment_hash: transaction.payment_hash,
          status: "pending",
        })
        .returning();
      finalPaymentId = paymentRows[0].id;
    }

    return {
      paymentRequest: transaction.invoice,
      paymentHash: transaction.payment_hash,
      payment_id: finalPaymentId,
      completion_id,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    throw new BadRequestError(
      msg.includes("timeout") ? "nwc_timeout" : "nwc_invoice_failed"
    );
  } finally {
    client.close();
  }
});
