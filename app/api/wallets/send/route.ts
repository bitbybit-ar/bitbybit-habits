import { apiHandler, BadRequestError, RateLimitError } from "@/lib/api";
import { getDecryptedNwcUrl } from "@/app/api/wallets/route";
import { NWCClient } from "@getalby/sdk";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

const sendRateLimiter = createRateLimiter(20, 60 * 1000); // 20 per minute

const BOLT11_RE = /^lnbc[0-9a-zA-Z]+1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/i;

/**
 * POST /api/wallets/send
 *
 * Pay a BOLT11 invoice from the authenticated user's NWC wallet.
 */
export const POST = apiHandler(async (request, { session, db }) => {
  const ip = getClientIp(request);
  const rateLimitResult = sendRateLimiter.check(`wallet-send:${session.user_id}:${ip}`);
  if (!rateLimitResult.success) {
    throw new RateLimitError(rateLimitResult.retryAfterMs ?? 0);
  }

  const body = await request.json();
  const { invoice } = body as { invoice: string };

  if (!invoice) {
    throw new BadRequestError("missing_invoice");
  }

  // Strip lightning: URI prefix if present
  const bolt11 = invoice.replace(/^lightning:/i, "").trim();

  // Validate BOLT11 format (lnbc prefix + bech32 checksum structure)
  if (!BOLT11_RE.test(bolt11)) {
    throw new BadRequestError("invalid_invoice");
  }

  const nwcUrl = await getDecryptedNwcUrl(session.user_id, db);
  if (!nwcUrl) {
    throw new BadRequestError("no_wallet");
  }

  const client = new NWCClient({ nostrWalletConnectUrl: nwcUrl });

  try {
    const payPromise = client.payInvoice({ invoice: bolt11 });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 30000)
    );

    const result = await Promise.race([payPromise, timeoutPromise]);
    return { preimage: result.preimage };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "payment_failed";
    if (msg.includes("insufficient") || msg.includes("INSUFFICIENT")) {
      throw new BadRequestError("insufficient_funds");
    }
    throw new BadRequestError("payment_failed");
  } finally {
    client.close();
  }
});
