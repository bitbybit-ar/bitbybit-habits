import { apiHandler, BadRequestError } from "@/lib/api";
import { getDecryptedNwcUrl } from "@/app/api/wallets/route";
import { NWCClient, Nip47WalletError, Nip47TimeoutError, Nip47NetworkError } from "@getalby/sdk";
import { extractPaymentHash } from "@/lib/lightning";

const MAX_INVOICE_SATS = 1_000_000;
const MAX_DESCRIPTION_LENGTH = 500;

/**
 * POST /api/wallets/receive
 *
 * Generate a Lightning invoice from the authenticated user's NWC wallet.
 * Rate limited (auth: 20/min).
 */
export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { amount_sats, description } = body as {
    amount_sats: number;
    description?: string;
  };

  if (!amount_sats || amount_sats <= 0 || !Number.isInteger(amount_sats)) {
    throw new BadRequestError("invalid_amount");
  }

  if (amount_sats > MAX_INVOICE_SATS) {
    throw new BadRequestError("amount_exceeds_limit");
  }

  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    throw new BadRequestError("description_too_long");
  }

  const nwcUrl = await getDecryptedNwcUrl(session.user_id, db);
  if (!nwcUrl) {
    throw new BadRequestError("no_wallet");
  }

  console.log(`[Wallet:Receive] Creating invoice for ${amount_sats} sats (user: ${session.user_id.slice(0, 8)})`);
  const client = new NWCClient({ nostrWalletConnectUrl: nwcUrl });

  try {
    const invoicePromise = client.makeInvoice({
      amount: amount_sats * 1000, // NWC uses millisats
      description: description?.trim() || "BitByBit",
    });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 15000)
    );

    const result = await Promise.race([invoicePromise, timeoutPromise]);
    // Some wallets (e.g. Primal) return empty payment_hash — extract from BOLT11
    const payment_hash = result.payment_hash || extractPaymentHash(result.invoice) || "";
    console.log(`[Wallet:Receive] Invoice created, hash: ${payment_hash.slice(0, 8)}...`);
    return {
      payment_request: result.invoice,
      payment_hash,
    };
  } catch (err) {
    console.error("[Wallet:Receive] makeInvoice error:", err);

    if (err instanceof Nip47WalletError) {
      if (err.code === "NOT_IMPLEMENTED") {
        throw new BadRequestError("make_invoice_not_supported");
      }
      if (err.code === "RATE_LIMITED") {
        throw new BadRequestError("wallet_rate_limited");
      }
      throw new BadRequestError(`wallet_error: ${err.code}`);
    }
    if (err instanceof Nip47TimeoutError) {
      throw new BadRequestError("nwc_timeout");
    }
    if (err instanceof Nip47NetworkError) {
      throw new BadRequestError("nwc_relay_error");
    }

    const msg = err instanceof Error ? err.message : "";
    if (msg === "timeout") {
      throw new BadRequestError("nwc_timeout");
    }
    throw new BadRequestError("invoice_failed");
  } finally {
    client.close();
  }
}, { rateLimit: "auth" });
