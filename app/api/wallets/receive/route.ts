import { apiHandler, BadRequestError } from "@/lib/api";
import { getDecryptedNwcUrl } from "@/app/api/wallets/route";
import { NWCClient } from "@getalby/sdk";

/**
 * POST /api/wallets/receive
 *
 * Generate a Lightning invoice from the authenticated user's NWC wallet.
 */
export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { amount_sats, description } = body as {
    amount_sats: number;
    description?: string;
  };

  if (!amount_sats || amount_sats <= 0) {
    throw new BadRequestError("invalid_amount");
  }

  const nwcUrl = await getDecryptedNwcUrl(session.user_id, db);
  if (!nwcUrl) {
    throw new BadRequestError("no_wallet");
  }

  console.log(`[Wallet:Receive] Creating invoice: ${amount_sats} sats (user: ${session.user_id.slice(0, 8)})`);

  const client = new NWCClient({ nostrWalletConnectUrl: nwcUrl });

  try {
    const invoicePromise = client.makeInvoice({
      amount: amount_sats * 1000, // NWC uses millisats
      description: description || "BitByBit",
    });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 10000)
    );

    const result = await Promise.race([invoicePromise, timeoutPromise]);
    console.log(`[Wallet:Receive] Invoice created, hash: ${result.payment_hash?.slice(0, 12)}...`);
    return {
      payment_request: result.invoice,
      payment_hash: result.payment_hash,
    };
  } catch (err) {
    console.error("[Wallet:Receive] NWC makeInvoice error:", err);
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("timeout")) {
      throw new BadRequestError("nwc_timeout");
    }
    throw new BadRequestError("invoice_failed");
  } finally {
    client.close();
  }
});
