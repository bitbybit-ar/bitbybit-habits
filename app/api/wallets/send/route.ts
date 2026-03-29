import { apiHandler, BadRequestError } from "@/lib/api";
import { getDecryptedNwcUrl } from "@/app/api/wallets/route";
import { NWCClient } from "@getalby/sdk";

/**
 * POST /api/wallets/send
 *
 * Pay a BOLT11 invoice from the authenticated user's NWC wallet.
 */
export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { invoice } = body as { invoice: string };

  if (!invoice) {
    throw new BadRequestError("missing_invoice");
  }

  // Strip lightning: URI prefix if present
  const bolt11 = invoice.replace(/^lightning:/i, "");

  if (!bolt11.startsWith("lnbc") && !bolt11.startsWith("LNBC")) {
    throw new BadRequestError("invalid_invoice");
  }

  const nwcUrl = await getDecryptedNwcUrl(session.user_id, db);
  if (!nwcUrl) {
    throw new BadRequestError("no_wallet");
  }

  console.log(`[Wallet:Send] Paying invoice ${bolt11.slice(0, 20)}... (user: ${session.user_id.slice(0, 8)})`);

  const client = new NWCClient({ nostrWalletConnectUrl: nwcUrl });

  try {
    const payPromise = client.payInvoice({ invoice: bolt11 });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 30000)
    );

    const result = await Promise.race([payPromise, timeoutPromise]);
    console.log(`[Wallet:Send] Payment successful, preimage: ${result.preimage?.slice(0, 8)}...`);
    return { preimage: result.preimage };
  } catch (err) {
    console.error("[Wallet:Send] NWC payInvoice error:", err);
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("insufficient") || msg.includes("not enough")) {
      throw new BadRequestError("insufficient_funds");
    }
    if (msg.includes("timeout")) {
      throw new BadRequestError("nwc_timeout");
    }
    throw new BadRequestError("payment_failed");
  } finally {
    client.close();
  }
});
