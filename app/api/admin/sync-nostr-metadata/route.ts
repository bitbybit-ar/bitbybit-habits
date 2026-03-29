import { apiHandler, UnauthorizedError } from "@/lib/api";
import { users } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { fetchNostrMetadataServer } from "@/lib/nostr/server-metadata";
import { eq, isNotNull, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/sync-nostr-metadata
 *
 * Bulk-refresh Nostr kind 0 metadata for all users who registered via Nostr.
 * Fetches each user's latest metadata from relays and updates the local DB.
 * Admin-only endpoint; can be triggered periodically via cron.
 */
export const POST = apiHandler(async (_req, { session, db }) => {
  if (!isAdmin(session)) {
    throw new UnauthorizedError("admin_only");
  }

  // Find all Nostr-origin users (auth_provider = 'nostr' and have a pubkey)
  const nostrUsers = await db
    .select({
      id: users.id,
      nostr_pubkey: users.nostr_pubkey,
      display_name: users.display_name,
      avatar_url: users.avatar_url,
    })
    .from(users)
    .where(
      sql`${users.auth_provider} = 'nostr' AND ${isNotNull(users.nostr_pubkey)}`
    );

  let synced = 0;
  let failed = 0;
  const results: Array<{ user_id: string; status: "synced" | "no_metadata" | "error" }> = [];

  // Process sequentially to avoid hammering relays
  for (const user of nostrUsers) {
    if (!user.nostr_pubkey) continue;

    try {
      const metadata = await fetchNostrMetadataServer(user.nostr_pubkey);

      if (!metadata) {
        results.push({ user_id: user.id, status: "no_metadata" });
        continue;
      }

      // Build updates from Nostr metadata
      const updates: Partial<typeof users.$inferInsert> = {
        nostr_metadata: metadata as Record<string, unknown>,
        nostr_metadata_updated_at: new Date(),
      };

      // Update display_name if Nostr has one and it differs
      const nostrDisplayName = (metadata.display_name || metadata.name) as string | undefined;
      if (nostrDisplayName && nostrDisplayName !== user.display_name) {
        updates.display_name = nostrDisplayName;
      }

      // Update avatar_url if Nostr has one and it differs
      if (metadata.picture && metadata.picture !== user.avatar_url) {
        updates.avatar_url = metadata.picture;
      }

      await db
        .update(users)
        .set(updates)
        .where(eq(users.id, user.id));

      synced++;
      results.push({ user_id: user.id, status: "synced" });
    } catch {
      failed++;
      results.push({ user_id: user.id, status: "error" });
    }
  }

  return {
    total: nostrUsers.length,
    synced,
    failed,
    no_metadata: nostrUsers.length - synced - failed,
    results,
  };
});
