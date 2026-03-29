import type { AuthSession } from "./types";

/**
 * Check if a session belongs to an admin user.
 * Admin is identified by their Nostr pubkey (hex format).
 * Supports multiple admins via comma-separated ADMIN_PUBKEYS env var.
 */
export function isAdmin(session: AuthSession): boolean {
  if (!session.nostr_pubkey) return false;

  const pubkeys = process.env.ADMIN_PUBKEYS?.split(",").map((k) => k.trim()).filter(Boolean) ?? [];
  return pubkeys.includes(session.nostr_pubkey);
}
