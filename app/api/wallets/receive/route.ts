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
    return {
      payment_request: result.invoice,
      payment_hash: result.payment_hash,
    };
  } catch {
    throw new BadRequestError("invoice_failed");
  } finally {
    client.close();
  }
});
