import type { AuthSession } from "./types";

/**
 * Check if a session belongs to an admin user.
 * Admin is identified by their Nostr pubkey (hex format) set in ADMIN_PUBKEY_HEX env var.
 */
export function isAdmin(session: AuthSession): boolean {
  const adminPubkey = process.env.ADMIN_PUBKEY_HEX;
  if (!adminPubkey) return false;
  return session.nostr_pubkey === adminPubkey;
}
