import { apiHandler, created, BadRequestError } from "@/lib/api";
import { wallets, type Db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";
import { eq, and } from "drizzle-orm";

/** Shape returned to the client — never expose the encrypted URL */
interface WalletPublic {
  id: string;
  user_id: string;
  label: string | null;
  active: boolean;
  connected: boolean;
  created_at: Date | null;
}

function toPublic(w: typeof wallets.$inferSelect): WalletPublic {
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
  const result = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.user_id, session.user_id), eq(wallets.active, true)))
    .limit(1);

  return result[0] ? toPublic(result[0]) : null;
});

export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { nwc_url, label } = body as { nwc_url: string; label?: string };

  if (!nwc_url || !nwc_url.startsWith("nostr+walletconnect://")) {
    throw new BadRequestError("invalid_nwc_url");
  }

  const encrypted = encrypt(nwc_url);

  const existing = await db
    .select({ id: wallets.id })
    .from(wallets)
    .where(eq(wallets.user_id, session.user_id));

  let wallet: (typeof wallets.$inferSelect)[];

  if (existing.length > 0) {
    wallet = await db
      .update(wallets)
      .set({ nwc_url_encrypted: encrypted, label: label ?? null, active: true })
      .where(eq(wallets.user_id, session.user_id))
      .returning();
  } else {
    wallet = await db
      .insert(wallets)
      .values({ user_id: session.user_id, nwc_url_encrypted: encrypted, label: label ?? null })
      .returning();
  }

  return created(toPublic(wallet[0]));
});

export const DELETE = apiHandler(async (_req, { session, db }) => {
  await db
    .update(wallets)
    .set({ active: false })
    .where(eq(wallets.user_id, session.user_id));

  return undefined;
});

/**
 * Internal helper — used by payment routes to get the decrypted NWC URL.
 * NOT exported as an HTTP handler.
 */
export async function getDecryptedNwcUrl(
  userId: string,
  db: Db
): Promise<string | null> {
  const result = await db
    .select({ nwc_url_encrypted: wallets.nwc_url_encrypted })
    .from(wallets)
    .where(and(eq(wallets.user_id, userId), eq(wallets.active, true)))
    .limit(1);

  if (!result[0]) return null;
  return decrypt(result[0].nwc_url_encrypted);
}
