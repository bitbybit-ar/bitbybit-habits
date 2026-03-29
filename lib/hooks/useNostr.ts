"use client";

import { useState, useEffect, useCallback } from "react";
import type { UnsignedNostrEvent } from "@/lib/nostr/types";
import type { NostrMetadata } from "@/lib/nostr/types";
import { fetchNostrMetadata, publishNostrMetadata, mergeNostrMetadata } from "@/lib/nostr/metadata";

interface NostrLoginResult {
  success: boolean;
  data?: {
    user_id: string;
    email: string;
    username: string;
    display_name: string;
    locale: string;
    role: "sponsor" | "kid" | null;
    nostr_pubkey: string;
    isNewUser: boolean;
  };
  error?: string;
}

interface NostrLinkResult {
  success: boolean;
  data?: {
    id: string;
    nostr_pubkey: string;
  };
  error?: string;
}

interface UseNostrReturn {
  hasExtension: boolean;
  login: () => Promise<NostrLoginResult>;
  linkAccount: () => Promise<NostrLinkResult>;
  unlinkAccount: () => Promise<{ success: boolean; error?: string }>;
  fetchAndSyncMetadata: (pubkey: string) => Promise<NostrMetadata | null>;
  publishProfileToNostr: (
    profile: { display_name?: string; username?: string; avatar_url?: string | null },
    cachedMetadata?: NostrMetadata | null,
  ) => Promise<boolean>;
  isLoading: boolean;
}

/**
 * Detects NIP-07 Nostr browser extensions (Alby, nos2x, etc.)
 * and provides NIP-42 challenge-response authentication + NIP-01 metadata sync.
 */
export function useNostr(): UseNostrReturn {
  const [hasExtension, setHasExtension] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const check = () => {
      if (window.nostr) {
        setHasExtension(true);
      }
    };

    check();
    // Re-check after extensions have time to inject
    const timer = setTimeout(check, 500);
    return () => clearTimeout(timer);
  }, []);

  /**
   * Perform the NIP-42 challenge-response flow:
   * 1. GET /api/auth/nostr to get a challenge
   * 2. Sign a kind 22242 event with the challenge
   * 3. POST the signed event back for verification
   */
  const performChallengeResponse = useCallback(async (endpoint: string) => {
    if (!window.nostr) {
      throw new Error("no_extension");
    }

    // Step 1: Get challenge
    const challengeRes = await fetch("/api/auth/nostr");
    const challengeData = await challengeRes.json();
    if (!challengeData.success) {
      throw new Error(challengeData.error || "challenge_failed");
    }
    const { challenge } = challengeData.data;

    // Step 2: Sign challenge event (NIP-07 extension adds pubkey automatically)
    const unsignedEvent: UnsignedNostrEvent = {
      kind: 22242,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: challenge,
    };

    const signedEvent = await window.nostr.signEvent(unsignedEvent);

    // Step 3: Send signed event to server
    const authRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signedEvent }),
    });

    return authRes.json();
  }, []);

  const login = useCallback(async (): Promise<NostrLoginResult> => {
    setIsLoading(true);
    try {
      const result = await performChallengeResponse("/api/auth/nostr");
      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "nostr_login_failed",
      };
    } finally {
      setIsLoading(false);
    }
  }, [performChallengeResponse]);

  const linkAccount = useCallback(async (): Promise<NostrLinkResult> => {
    setIsLoading(true);
    try {
      const result = await performChallengeResponse("/api/auth/nostr/link");
      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "nostr_link_failed",
      };
    } finally {
      setIsLoading(false);
    }
  }, [performChallengeResponse]);

  const unlinkAccount = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/nostr/link", { method: "DELETE" });
      return res.json();
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "nostr_unlink_failed",
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch kind 0 metadata from relays and sync to the local profile.
   * Returns the fetched metadata (also sends it to the server for caching).
   */
  const fetchAndSyncMetadata = useCallback(async (pubkey: string): Promise<NostrMetadata | null> => {
    const metadata = await fetchNostrMetadata(pubkey);
    if (!metadata) return null;

    // Build profile updates from Nostr metadata
    const updates: Record<string, unknown> = { nostr_metadata: metadata };
    if (metadata.display_name || metadata.name) {
      updates.display_name = metadata.display_name || metadata.name;
    }
    if (metadata.picture) {
      updates.avatar_url = metadata.picture;
    }

    // Sync to server
    await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    return metadata;
  }, []);

  /**
   * Publish profile changes to Nostr relays, preserving existing metadata
   * fields that BitByBit doesn't manage (about, banner, lud16, nip05, etc.).
   *
   * @param profile - The BitByBit-managed fields being updated
   * @param cachedMetadata - Previously fetched kind 0 metadata (avoids re-fetch if available)
   */
  const publishProfileToNostr = useCallback(async (
    profile: { display_name?: string; username?: string; avatar_url?: string | null },
    cachedMetadata?: NostrMetadata | null,
  ): Promise<boolean> => {
    if (!window.nostr) return false;

    try {
      // Get current metadata from relays or use cache
      let existing = cachedMetadata ?? null;
      if (!existing) {
        const pubkey = await window.nostr.getPublicKey();
        existing = await fetchNostrMetadata(pubkey);
      }

      // Merge only BitByBit fields, preserve everything else
      const merged = mergeNostrMetadata(existing, profile);

      // Sign and publish via NIP-07
      return await publishNostrMetadata(merged);
    } catch {
      return false;
    }
  }, []);

  return {
    hasExtension,
    login,
    linkAccount,
    unlinkAccount,
    fetchAndSyncMetadata,
    publishProfileToNostr,
    isLoading,
  };
}
