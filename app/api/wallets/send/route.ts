import { apiHandler, BadRequestError } from "@/lib/api";
import { getDecryptedNwcUrl } from "@/app/api/wallets/route";
import { NWCClient, Nip47WalletError, Nip47TimeoutError, Nip47NetworkError } from "@getalby/sdk";

// BOLT11: ln + network (bc/tb/bcrt/tbs) + optional amount + 1 separator + bech32 data
const BOLT11_RE = /^ln(bc|tb|bcrt|tbs)\d*[munp]?1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/i;

/**
 * POST /api/wallets/send
 *
 * Pay a BOLT11 invoice from the authenticated user's NWC wallet.
 * Rate limited (auth: 20/min).
 */
export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { invoice } = body as { invoice: string };

  if (!invoice) {
    throw new BadRequestError("missing_invoice");
  }

  // Strip lightning: URI prefix if present
  const bolt11 = invoice.replace(/^lightning:/i, "").trim();

  // Validate BOLT11 format
  if (!BOLT11_RE.test(bolt11)) {
    console.error(`[Wallet:Send] Invalid BOLT11 format (user: ${session.user_id.slice(0, 8)}): ${bolt11.slice(0, 20)}...`);
    throw new BadRequestError("invalid_invoice");
  }

  const nwcUrl = await getDecryptedNwcUrl(session.user_id, db);
  if (!nwcUrl) {
    throw new BadRequestError("no_wallet");
  }

  console.log(`[Wallet:Send] Paying invoice (user: ${session.user_id.slice(0, 8)}, invoice: ${bolt11.slice(0, 20)}...)`);
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
    console.error("[Wallet:Send] payInvoice error:", err);

    if (err instanceof Nip47WalletError) {
      const code = err.code?.toUpperCase() ?? "";
      if (code.includes("INSUFFICIENT") || code === "INSUFFICIENT_BALANCE") {
        throw new BadRequestError("insufficient_funds");
      }
      if (code === "QUOTA_EXCEEDED") {
        throw new BadRequestError("quota_exceeded");
      }
      if (code === "RATE_LIMITED") {
        throw new BadRequestError("wallet_rate_limited");
      }
      if (code === "NOT_IMPLEMENTED") {
        throw new BadRequestError("pay_not_supported");
      }
      throw new BadRequestError(`wallet_error: ${err.code}`);
    }
    if (err instanceof Nip47TimeoutError) {
      throw new BadRequestError("nwc_timeout");
    }
    if (err instanceof Nip47NetworkError) {
      throw new BadRequestError("nwc_relay_error");
    }

    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("timeout")) {
      throw new BadRequestError("nwc_timeout");
    }
    if (msg.includes("insufficient") || msg.includes("not enough")) {
      throw new BadRequestError("insufficient_funds");
    }
    throw new BadRequestError("payment_failed");
  } finally {
    client.close();
  }
}, { rateLimit: "auth" });
