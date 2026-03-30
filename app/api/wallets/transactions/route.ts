import { apiHandler, BadRequestError } from "@/lib/api";
import { getDecryptedNwcUrl } from "@/app/api/wallets/route";
import { NWCClient } from "@getalby/sdk";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

/**
 * GET /api/wallets/transactions
 *
 * Fetches recent transactions from the authenticated user's NWC wallet.
 * Query params: limit (default 20, max 50), offset (default 0)
 */
export const GET = apiHandler(async (request, { session, db }) => {
  const url = new URL(request.url);
  const limitParam = parseInt(url.searchParams.get("limit") ?? "", 10);
  const offsetParam = parseInt(url.searchParams.get("offset") ?? "", 10);

  const limit = Number.isFinite(limitParam) && limitParam > 0
    ? Math.min(limitParam, MAX_LIMIT)
    : DEFAULT_LIMIT;
  const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0;

  const nwcUrl = await getDecryptedNwcUrl(session.user_id, db);
  if (!nwcUrl) {
    throw new BadRequestError("no_wallet");
  }

  console.log(`[Wallet:Transactions] Fetching (user: ${session.user_id.slice(0, 8)}, limit: ${limit}, offset: ${offset})`);
  const client = new NWCClient({ nostrWalletConnectUrl: nwcUrl });

  try {
    const result = await Promise.race([
      client.listTransactions({ limit: limit + offset }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 15000)
      ),
    ]);

    const allTxs = result.transactions ?? [];

    // Apply offset manually since NWC doesn't natively support it
    const txs = allTxs.slice(offset, offset + limit);

    const transactions = txs.map((tx) => ({
      type: tx.type ?? (tx.amount > 0 ? "incoming" : "outgoing"),
      amount_sats: Math.abs(Math.floor(tx.amount / 1000)),
      description: tx.description || null,
      payment_hash: tx.payment_hash || null,
      preimage: tx.preimage || null,
      state: tx.state ?? "settled",
      created_at: tx.created_at
        ? new Date(tx.created_at * 1000).toISOString()
        : null,
      settled_at: tx.settled_at
        ? new Date(tx.settled_at * 1000).toISOString()
        : null,
    }));

    console.log(`[Wallet:Transactions] Returned ${transactions.length} transactions`);
    return { transactions, has_more: allTxs.length > offset + limit };
  } catch (err) {
    console.error("[Wallet:Transactions] NWC error:", err);

    const msg = err instanceof Error ? err.message : "";
    if (msg === "timeout") {
      throw new BadRequestError("nwc_timeout");
    }
    throw new BadRequestError("transactions_failed");
  } finally {
    client.close();
  }
});
