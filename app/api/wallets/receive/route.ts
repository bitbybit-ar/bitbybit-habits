import { apiHandler, BadRequestError, RateLimitError } from "@/lib/api";
import { getDecryptedNwcUrl } from "@/app/api/wallets/route";
import { NWCClient } from "@getalby/sdk";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

const receiveRateLimiter = createRateLimiter(20, 60 * 1000); // 20 per minute

const MAX_INVOICE_SATS = 1_000_000;
const MAX_DESCRIPTION_LENGTH = 500;

/**
 * POST /api/wallets/receive
 *
 * Generate a Lightning invoice from the authenticated user's NWC wallet.
 */
export const POST = apiHandler(async (request, { session, db }) => {
  const ip = getClientIp(request);
  const rateLimitResult = receiveRateLimiter.check(`wallet-receive:${session.user_id}:${ip}`);
  if (!rateLimitResult.success) {
    throw new RateLimitError(rateLimitResult.retryAfterMs ?? 0);
  }

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
