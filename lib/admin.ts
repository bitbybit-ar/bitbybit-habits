import type { AuthSession } from "./types";

// Hardcoded fallback so admin works even without the env var (e.g. production)
const FALLBACK_ADMIN_PUBKEYS: string[] = [
  "d9590d95a7811e1cb312be66edd664d7e3e6ed57822ad9f213ed620fc6748be8", // Ani (repo owner)
];

/**
 * Check if a session belongs to an admin user.
 * Admin is identified by their Nostr pubkey (hex format).
 * Checks ADMIN_PUBKEY_HEX env var first, then falls back to hardcoded list.
 */
export function isAdmin(session: AuthSession): boolean {
  if (!session.nostr_pubkey) return false;

  const envPubkey = process.env.ADMIN_PUBKEY_HEX;
  if (envPubkey && session.nostr_pubkey === envPubkey) return true;

  return FALLBACK_ADMIN_PUBKEYS.includes(session.nostr_pubkey);
}
