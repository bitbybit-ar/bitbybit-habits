import { apiHandler } from "@/lib/api";
import { getDecryptedNwcUrl } from "@/app/api/wallets/route";
import { NWCClient } from "@getalby/sdk";

/**
 * GET /api/wallets/balance
 *
 * Fetches the balance and node info of the authenticated user's NWC wallet.
 * Returns balance in sats and node info (alias, network, supported methods).
 * Best-effort — returns null for fields the wallet doesn't support.
 */
export const GET = apiHandler(async (_request, { session, db }) => {
  const nwcUrl = await getDecryptedNwcUrl(session.user_id, db);
  if (!nwcUrl) {
    return { balance_sats: null, node_info: null };
  }

  console.log(`[Wallet:Balance] Fetching balance + info (user: ${session.user_id.slice(0, 8)})`);

  const client = new NWCClient({ nostrWalletConnectUrl: nwcUrl });

  try {
    const timeout = <T>(promise: Promise<T>, ms: number): Promise<T | null> =>
      Promise.race([
        promise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
      ]);

    // Fetch balance and node info in parallel
    const [balanceResult, infoResult] = await Promise.all([
      timeout(client.getBalance(), 5000),
      timeout(client.getInfo(), 5000),
    ]);

    const balanceSats = balanceResult
      ? Math.floor(balanceResult.balance / 1000)
      : null;

    const nodeInfo = infoResult
      ? {
          alias: infoResult.alias || null,
          pubkey: infoResult.pubkey || null,
          network: infoResult.network || null,
          methods: infoResult.methods || [],
          color: infoResult.color || null,
          block_height: infoResult.block_height || null,
        }
      : null;

    console.log(
      `[Wallet:Balance] Balance: ${balanceSats} sats, node: ${nodeInfo?.alias ?? "unknown"}`
    );

    return { balance_sats: balanceSats, node_info: nodeInfo };
  } catch (err) {
    console.error("[Wallet:Balance] NWC error:", err);
    return { balance_sats: null, node_info: null };
  } finally {
    client.close();
  }
});
