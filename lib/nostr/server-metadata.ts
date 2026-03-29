import WebSocket from "ws";
import { DEFAULT_RELAYS } from "./relays";
import type { NostrEvent, NostrMetadata } from "./types";

/**
 * Server-side: Fetch the latest kind 0 (metadata) event for a pubkey from relays.
 * Uses the `ws` package for WebSocket (works in Node.js without browser APIs).
 */
export async function fetchNostrMetadataServer(
  pubkey: string,
  relayUrls?: string[],
  timeoutMs = 8000
): Promise<NostrMetadata | null> {
  const urls = relayUrls ?? DEFAULT_RELAYS;

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
        const subId = `srv_${Math.random().toString(36).slice(2, 8)}`;

        ws.on("open", () => {
          ws.send(JSON.stringify([
            "REQ",
            subId,
            { kinds: [0], authors: [pubkey], limit: 1 },
          ]));
        });

        ws.on("message", (raw: Buffer) => {
          try {
            const data = JSON.parse(raw.toString());
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
        });

        ws.on("error", () => { try { ws.close(); } catch { /* ignore */ } });
        ws.on("close", checkAllDone);
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
