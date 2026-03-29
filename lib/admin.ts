import type { AuthSession } from "./types";

/**
 * Admin public key (hex format, as stored in the database).
 * npub1m9vsm9d8sy0pevcjhenwm4ny6l37dm2hsg4dnusna43ql3n5305qy4zlg4
 * Only users with this pubkey linked to their account can access admin routes.
 */
const ADMIN_PUBKEY_HEX = "d9590d95a7811e1cb312be66edd664d7e3e6ed57822ad9f213ed620fc6748be8";

export function isAdmin(session: AuthSession): boolean {
  return session.nostr_pubkey === ADMIN_PUBKEY_HEX;
}
