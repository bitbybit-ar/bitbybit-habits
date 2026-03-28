"use client";

import { useState, useEffect, useCallback } from "react";
import type { UnsignedNostrEvent } from "@/lib/nostr/types";

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
  isLoading: boolean;
}

/**
 * Detects NIP-07 Nostr browser extensions (Alby, nos2x, etc.)
 * and provides NIP-42 challenge-response authentication.
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

    // Step 2: Get pubkey and sign challenge event
    const pubkey = await window.nostr.getPublicKey();

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

  return { hasExtension, login, linkAccount, unlinkAccount, isLoading };
}
