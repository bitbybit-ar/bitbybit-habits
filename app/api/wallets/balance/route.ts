import { apiHandler } from "@/lib/api";
import { getDecryptedNwcUrl } from "@/app/api/wallets/route";
import { NWCClient } from "@getalby/sdk";

const RELAY_TIMEOUT_MS = 10000;

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
    console.log("[Balance] No NWC URL found for user");
    return { balance_sats: null, node_info: null };
  }

  let client: NWCClient;
  try {
    client = new NWCClient({ nostrWalletConnectUrl: nwcUrl });
  } catch (err) {
    console.error("[Balance] Failed to create NWCClient:", err instanceof Error ? err.message : err);
    return { balance_sats: null, node_info: null };
  }

  try {
    const timeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T | null> =>
      Promise.race([
        promise,
        new Promise<null>((resolve) => {
          setTimeout(() => {
            console.warn(`[Balance] ${label} timed out after ${ms}ms`);
            resolve(null);
          }, ms);
        }),
      ]);

    // Fetch balance and node info in parallel
    const [balanceResult, infoResult] = await Promise.all([
      timeout(client.getBalance(), RELAY_TIMEOUT_MS, "getBalance").catch((err) => {
        console.warn("[Balance] getBalance error:", err instanceof Error ? err.message : err);
        return null;
      }),
      timeout(client.getInfo(), RELAY_TIMEOUT_MS, "getInfo").catch((err) => {
        console.warn("[Balance] getInfo error:", err instanceof Error ? err.message : err);
        return null;
      }),
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

    if (!balanceSats && !nodeInfo) {
      console.warn("[Balance] Both balance and info returned null — relay may be unreachable");
    }

    return { balance_sats: balanceSats, node_info: nodeInfo };
  } catch (err) {
    console.error("[Balance] Unexpected error:", err instanceof Error ? err.message : err);
    return { balance_sats: null, node_info: null };
  } finally {
    client.close();
  }
});
