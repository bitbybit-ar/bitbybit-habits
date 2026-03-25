"use client";

import { useState, useEffect } from "react";

interface WebLNState {
  hasExtension: boolean;
  extensionName: string | null;
}

/**
 * Detects WebLN-compatible browser extensions (e.g., Alby).
 * Only runs client-side.
 */
export function useWebLN(): WebLNState {
  const [state, setState] = useState<WebLNState>({
    hasExtension: false,
    extensionName: null,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check immediately and also after a short delay (extensions may inject late)
    const check = () => {
      const webln = (window as unknown as { webln?: { name?: string } }).webln;
      if (webln) {
        setState({
          hasExtension: true,
          extensionName: webln.name ?? "WebLN",
        });
      }
    };

    check();

    // Re-check after extensions have time to inject
    const timer = setTimeout(check, 500);
    return () => clearTimeout(timer);
  }, []);

  return state;
}
