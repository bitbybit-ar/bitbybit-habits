import { apiHandler, created, BadRequestError } from "@/lib/api";
import type { Wallet } from "@/lib/types";

export const GET = apiHandler(async (_req, { session, db }) => {
  const wallets = await db`
    SELECT * FROM wallets
    WHERE user_id = ${session.user_id} AND active = true
    LIMIT 1
  ` as Wallet[];

  return wallets[0] ?? null;
});

export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { nwc_url, label } = body as { nwc_url: string; label?: string };

  if (!nwc_url || !nwc_url.startsWith("nostr+walletconnect://")) {
    throw new BadRequestError("URL de NWC inválida");
  }

  const existing = await db`
    SELECT id FROM wallets WHERE user_id = ${session.user_id}
  `;

  let wallet: Wallet[];

  if (existing.length > 0) {
    wallet = await db`
      UPDATE wallets
      SET nwc_url = ${nwc_url}, label = ${label ?? null}, active = true
      WHERE user_id = ${session.user_id}
      RETURNING *
    ` as Wallet[];
  } else {
    wallet = await db`
      INSERT INTO wallets (user_id, nwc_url, label)
      VALUES (${session.user_id}, ${nwc_url}, ${label ?? null})
      RETURNING *
    ` as Wallet[];
  }

  return created(wallet[0]);
});

export const DELETE = apiHandler(async (_req, { session, db }) => {
  await db`
    UPDATE wallets SET active = false
    WHERE user_id = ${session.user_id}
  `;

  return undefined;
});
