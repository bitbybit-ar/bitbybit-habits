/**
 * One-time migration script:
 * 1. Adds auth_provider, nostr_metadata, nostr_metadata_updated_at columns (if missing)
 * 2. Backfills auth_provider = 'nostr' for existing Nostr-registered users
 * 3. Fetches kind 0 metadata from relays for all Nostr users
 * 4. Updates display_name, avatar_url, nostr_metadata from real Nostr data
 *
 * Usage: node scripts/migrate-nostr-metadata.mjs
 */

import postgres from "postgres";
import WebSocket from "ws";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
  "wss://nos.lol",
  "wss://relay.primal.net",
];

/**
 * Fetch kind 0 metadata for a pubkey from relays (server-side with ws)
 */
function fetchMetadata(pubkey, timeoutMs = 8000) {
  return new Promise((resolve) => {
    let bestEvent = null;
    let resolved = false;
    const sockets = [];

    const finish = () => {
      if (resolved) return;
      resolved = true;
      for (const s of sockets) {
        try { s.close(); } catch {}
      }
      if (bestEvent) {
        try {
          resolve(JSON.parse(bestEvent.content));
        } catch {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    };

    const timer = setTimeout(finish, timeoutMs);

    let closedCount = 0;
    const checkDone = () => {
      closedCount++;
      if (closedCount >= DEFAULT_RELAYS.length) {
        clearTimeout(timer);
        finish();
      }
    };

    for (const url of DEFAULT_RELAYS) {
      try {
        const ws = new WebSocket(url);
        sockets.push(ws);
        const subId = `mig_${Math.random().toString(36).slice(2, 8)}`;

        ws.on("open", () => {
          ws.send(JSON.stringify([
            "REQ", subId,
            { kinds: [0], authors: [pubkey], limit: 1 },
          ]));
        });

        ws.on("message", (raw) => {
          try {
            const data = JSON.parse(raw.toString());
            if (data[0] === "EVENT" && data[2]) {
              const event = data[2];
              if (!bestEvent || event.created_at > bestEvent.created_at) {
                bestEvent = event;
              }
            }
            if (data[0] === "EOSE") {
              ws.close();
            }
          } catch {}
        });

        ws.on("error", () => { try { ws.close(); } catch {} });
        ws.on("close", checkDone);
      } catch {
        closedCount++;
      }
    }
  });
}

async function main() {
  console.log("=== Nostr Metadata Migration ===\n");

  // Step 1: Add missing columns (safe with IF NOT EXISTS pattern)
  console.log("1. Adding columns if missing...");

  await sql`
    DO $$ BEGIN
      ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'email';
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$
  `;
  await sql`
    DO $$ BEGIN
      ALTER TABLE users ADD COLUMN nostr_metadata JSONB;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$
  `;
  await sql`
    DO $$ BEGIN
      ALTER TABLE users ADD COLUMN nostr_metadata_updated_at TIMESTAMP;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$
  `;
  console.log("   Columns ready.\n");

  // Step 2: Backfill auth_provider for Nostr users
  console.log("2. Backfilling auth_provider = 'nostr' for Nostr-registered users...");
  const backfillResult = await sql`
    UPDATE users SET auth_provider = 'nostr'
    WHERE email LIKE 'nostr_%@bitbybit.nostr'
      AND auth_provider = 'email'
    RETURNING id, email
  `;
  console.log(`   Updated ${backfillResult.length} users.\n`);

  // Step 3: Fetch all Nostr users
  console.log("3. Fetching Nostr users from DB...");
  const nostrUsers = await sql`
    SELECT id, nostr_pubkey, display_name, avatar_url, email
    FROM users
    WHERE nostr_pubkey IS NOT NULL
  `;
  console.log(`   Found ${nostrUsers.length} Nostr users.\n`);

  if (nostrUsers.length === 0) {
    console.log("No Nostr users to sync. Done!");
    await sql.end();
    process.exit(0);
  }

  // Step 4: Fetch metadata from relays and update DB
  console.log("4. Fetching kind 0 metadata from relays...\n");

  let synced = 0;
  let noMeta = 0;
  let errors = 0;

  for (const user of nostrUsers) {
    const pubkey = user.nostr_pubkey;
    const shortPk = pubkey.slice(0, 12);
    process.stdout.write(`   [${shortPk}...] `);

    try {
      const metadata = await fetchMetadata(pubkey);

      if (!metadata) {
        console.log("no metadata found on relays");
        noMeta++;
        continue;
      }

      const displayName = metadata.display_name || metadata.name || null;
      const picture = metadata.picture || null;

      await sql`
        UPDATE users SET
          nostr_metadata = ${JSON.stringify(metadata)}::jsonb,
          nostr_metadata_updated_at = NOW(),
          display_name = COALESCE(${displayName}, display_name),
          avatar_url = COALESCE(${picture}, avatar_url)
        WHERE id = ${user.id}::uuid
      `;

      const parts = [];
      if (displayName) parts.push(`name="${displayName}"`);
      if (picture) parts.push(`picture=yes`);
      if (metadata.nip05) parts.push(`nip05="${metadata.nip05}"`);
      if (metadata.lud16) parts.push(`lud16="${metadata.lud16}"`);
      console.log(`synced (${parts.join(", ") || "metadata cached"})`);
      synced++;
    } catch (err) {
      console.log(`error: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`   Synced:      ${synced}`);
  console.log(`   No metadata: ${noMeta}`);
  console.log(`   Errors:      ${errors}`);
  console.log(`   Total:       ${nostrUsers.length}`);

  await sql.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("Migration failed:", err);
  await sql.end();
  process.exit(1);
});
