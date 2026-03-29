"use client";

import type { NostrEvent, NostrMetadata } from "./types";
import { DEFAULT_RELAYS } from "./relays";

/**
 * Get relay URLs from NIP-07 extension, falling back to defaults.
 */
async function getRelays(): Promise<string[]> {
  try {
    if (window.nostr?.getRelays) {
      const relayMap = await window.nostr.getRelays();
      const urls = Object.keys(relayMap);
      if (urls.length > 0) return urls;
    }
  } catch { /* fall through */ }
  return DEFAULT_RELAYS;
}

/**
 * Fetch the latest kind 0 (metadata) event for a pubkey from relays.
 * Queries multiple relays in parallel and returns the most recent content.
 */
export async function fetchNostrMetadata(
  pubkey: string,
  relayUrls?: string[],
  timeoutMs = 5000
): Promise<NostrMetadata | null> {
  const urls = relayUrls ?? await getRelays();

  return new Promise((resolve) => {
    let bestEvent: NostrEvent | null = null;
    let resolved = false;
    const sockets: WebSocket[] = [];

    const finish = () => {
      if (resolved) return;
      resolved = true;
      for (const s of sockets) {
        try { s.close(); } catch { /* ignore */ }
      }
      if (bestEvent) {
        try {
          resolve(JSON.parse(bestEvent.content) as NostrMetadata);
        } catch {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    };

    const timer = setTimeout(finish, timeoutMs);

    let closedCount = 0;
    const checkAllDone = () => {
      closedCount++;
      if (closedCount >= urls.length) {
        clearTimeout(timer);
        finish();
      }
    };

    for (const url of urls) {
      try {
        const ws = new WebSocket(url);
        sockets.push(ws);
        const subId = `meta_${Math.random().toString(36).slice(2, 8)}`;

        ws.onopen = () => {
          ws.send(JSON.stringify([
            "REQ",
            subId,
            { kinds: [0], authors: [pubkey], limit: 1 },
          ]));
        };

        ws.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data as string);
            if (data[0] === "EVENT" && data[2]) {
              const event = data[2] as NostrEvent;
              if (!bestEvent || event.created_at > bestEvent.created_at) {
                bestEvent = event;
              }
            }
            if (data[0] === "EOSE") {
              ws.close();
            }
          } catch { /* ignore parse errors */ }
        };

        ws.onerror = () => { try { ws.close(); } catch { /* ignore */ } };
        ws.onclose = checkAllDone;
      } catch {
        closedCount++;
      }
    }

    if (urls.length === 0) {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

/**
 * Publish a kind 0 (metadata) event to relays.
 * Uses NIP-07 browser extension to sign the event.
 * Returns true if at least one relay accepted the event.
 */
export async function publishNostrMetadata(
  metadata: NostrMetadata,
  relayUrls?: string[],
  timeoutMs = 5000
): Promise<boolean> {
  if (!window.nostr) return false;

  const urls = relayUrls ?? await getRelays();

  const unsignedEvent = {
    kind: 0,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: JSON.stringify(metadata),
  };

  const signedEvent = await window.nostr.signEvent(unsignedEvent);

  return new Promise((resolve) => {
    let okCount = 0;
    let doneCount = 0;
    let resolved = false;
    const sockets: WebSocket[] = [];

    const finish = (success: boolean) => {
      if (resolved) return;
      resolved = true;
      for (const s of sockets) {
        try { s.close(); } catch { /* ignore */ }
      }
      resolve(success);
    };

    const timer = setTimeout(() => finish(okCount > 0), timeoutMs);

    const checkDone = () => {
      doneCount++;
      if (doneCount >= urls.length) {
        clearTimeout(timer);
        finish(okCount > 0);
      }
    };

    for (const url of urls) {
      try {
        const ws = new WebSocket(url);
        sockets.push(ws);

        ws.onopen = () => {
          ws.send(JSON.stringify(["EVENT", signedEvent]));
        };

        ws.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data as string);
            if (data[0] === "OK" && data[2] === true) {
              okCount++;
            }
          } catch { /* ignore */ }
          checkDone();
        };

        ws.onerror = checkDone;
      } catch {
        doneCount++;
      }
    }

    if (urls.length === 0) {
      clearTimeout(timer);
      resolve(false);
    }
  });
}

/**
 * Merge BitByBit profile fields into existing Nostr metadata,
 * preserving all fields that BitByBit does not manage.
 *
 * Only touches: name, display_name, picture.
 * Leaves untouched: about, banner, nip05, lud06, lud16, website, and any custom fields.
 */
export function mergeNostrMetadata(
  existing: NostrMetadata | null,
  updates: { display_name?: string; username?: string; avatar_url?: string | null }
): NostrMetadata {
  const merged: NostrMetadata = { ...(existing ?? {}) };

  if (updates.display_name !== undefined) {
    merged.display_name = updates.display_name;
  }
  if (updates.username !== undefined) {
    merged.name = updates.username;
  }
  if (updates.avatar_url !== undefined) {
    if (updates.avatar_url) {
      merged.picture = updates.avatar_url;
    } else {
      delete merged.picture;
    }
  }

  return merged;
}
