import { apiHandler } from "@/lib/api";
import { getDecryptedNwcUrl } from "@/app/api/wallets/route";
import { NWCClient } from "@getalby/sdk";

/**
 * GET /api/wallets/balance
 *
 * Fetches the balance of the authenticated user's NWC wallet.
 * Returns balance in sats. Best-effort — returns null if wallet
 * doesn't support getBalance or times out.
 */
export const GET = apiHandler(async (_request, { session, db }) => {
  const nwcUrl = await getDecryptedNwcUrl(session.user_id, db);
  if (!nwcUrl) {
    return { balance_sats: null };
  }

  console.log(`[Wallet:Balance] Fetching balance (user: ${session.user_id.slice(0, 8)})`);

  const client = new NWCClient({ nostrWalletConnectUrl: nwcUrl });

  try {
    const balancePromise = client.getBalance();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 5000)
    );

    const result = await Promise.race([balancePromise, timeoutPromise]);
    const balanceSats = Math.floor(result.balance / 1000);
    console.log(`[Wallet:Balance] Balance: ${balanceSats} sats`);
    // NWC returns balance in millisats
    return { balance_sats: balanceSats };
  } catch (err) {
    console.error("[Wallet:Balance] NWC getBalance error:", err);
    return { balance_sats: null };
  } finally {
    client.close();
  }
});
