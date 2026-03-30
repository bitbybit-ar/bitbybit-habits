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

  const client = new NWCClient({ nostrWalletConnectUrl: nwcUrl });

  try {
    const timeout = <T>(promise: Promise<T>, ms: number): Promise<T | null> =>
      Promise.race([
        promise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
      ]);

    // Fetch balance and node info in parallel (15s timeout for slow relays)
    const [balanceResult, infoResult] = await Promise.all([
      timeout(client.getBalance(), 15000),
      timeout(client.getInfo(), 15000),
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

    return { balance_sats: balanceSats, node_info: nodeInfo };
  } catch {
    return { balance_sats: null, node_info: null };
  } finally {
    client.close();
  }
});
