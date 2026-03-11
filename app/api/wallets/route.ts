import { apiHandler, created, BadRequestError } from "@/lib/api";
import { encrypt, decrypt } from "@/lib/crypto";
import type { Wallet } from "@/lib/types";

/** Shape returned to the client — never expose the encrypted URL */
interface WalletPublic {
  id: string;
  user_id: string;
  label?: string;
  active: boolean;
  connected: boolean;
  created_at: string;
}

function toPublic(w: Wallet): WalletPublic {
  return {
    id: w.id,
    user_id: w.user_id,
    label: w.label,
    active: w.active,
    connected: true,
    created_at: w.created_at,
  };
}

export const GET = apiHandler(async (_req, { session, db }) => {
  const wallets = await db`
    SELECT * FROM wallets
    WHERE user_id = ${session.user_id} AND active = true
    LIMIT 1
  ` as Wallet[];

  if (!wallets[0]) return null;
  return toPublic(wallets[0]);
});

export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { nwc_url, label } = body as { nwc_url: string; label?: string };

  if (!nwc_url || !nwc_url.startsWith("nostr+walletconnect://")) {
    throw new BadRequestError("URL de NWC inválida");
  }

  const encrypted = encrypt(nwc_url);

  const existing = await db`
    SELECT id FROM wallets WHERE user_id = ${session.user_id}
  `;

  let wallet: Wallet[];

  if (existing.length > 0) {
    wallet = await db`
      UPDATE wallets
      SET nwc_url_encrypted = ${encrypted}, label = ${label ?? null}, active = true
      WHERE user_id = ${session.user_id}
      RETURNING *
    ` as Wallet[];
  } else {
    wallet = await db`
      INSERT INTO wallets (user_id, nwc_url_encrypted, label)
      VALUES (${session.user_id}, ${encrypted}, ${label ?? null})
      RETURNING *
    ` as Wallet[];
  }

  return created(toPublic(wallet[0]));
});

export const DELETE = apiHandler(async (_req, { session, db }) => {
  await db`
    UPDATE wallets SET active = false
    WHERE user_id = ${session.user_id}
  `;

  return undefined;
});

/**
 * Internal helper — used by payment routes to get the decrypted NWC URL.
 * NOT exported as an HTTP handler.
 */
export async function getDecryptedNwcUrl(
  userId: string,
  db: Parameters<Parameters<typeof apiHandler>[0]>[1]["db"]
): Promise<string | null> {
  const wallets = await db`
    SELECT nwc_url_encrypted FROM wallets
    WHERE user_id = ${userId} AND active = true
    LIMIT 1
  ` as Pick<Wallet, "nwc_url_encrypted">[];

  if (!wallets[0]) return null;
  return decrypt(wallets[0].nwc_url_encrypted);
}
